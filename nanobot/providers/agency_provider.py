"""Agency Copilot provider — uses Agency CopilotClient CLI."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any

from loguru import logger

from nanobot.providers.base import LLMProvider, LLMResponse

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_START_RETRIES = 3
RETRY_BACKOFF_BASE = 2.0   # seconds
RESPONSE_TIMEOUT = 300.0   # seconds


# ---------------------------------------------------------------------------
# Hooks
# ---------------------------------------------------------------------------

async def _auto_approve(input_data: dict, invocation: Any) -> dict:
    """Always allow tool execution — used in unattended / trusted contexts."""
    return {"permissionDecision": "allow"}


# ---------------------------------------------------------------------------
# Event logger (for debug observability)
# ---------------------------------------------------------------------------

def _make_event_logger(model: str):
    """Return a session event handler that logs tool/reasoning events."""

    def _handler(event: Any) -> None:
        try:
            etype = event.type.value if hasattr(event.type, "value") else str(event.type)
            if etype == "assistant.reasoning":
                logger.debug("AgencyProvider [{}] reasoning: {}", model, (event.data.content or "")[:120])
            elif etype in ("tool.execution_start", "tool_execution_start"):
                tool_name = getattr(event.data, "tool_name", None) or getattr(event.data, "toolName", "?")
                logger.debug("AgencyProvider [{}] tool: {}", model, tool_name)
        except Exception:
            pass

    return _handler


# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------

class AgencyProvider(LLMProvider):
    """
    LLM provider that delegates to the Agency CopilotClient.

    Authentication priority (CopilotAuth pattern):
      1. Agency CLI binary  — manages token refresh automatically.
      2. github_token param — explicit PAT / GITHUB_TOKEN.
      3. gh session         — fallback when CLI not found and no token given.

    The Agency process handles its own agentic loop (tool calls, multi-step).
    Only the final text response is returned to nanobot.

    Skills from ``skills_dir`` (if it exists) are passed to the session so
    Copilot learns domain-specific knowledge defined in SKILL.md files.
    """

    def __init__(
        self,
        cli_path: str = "~/.config/agency/CurrentVersion/agency",
        cli_args: list[str] | None = None,
        default_model: str = "agency/copilot",
        github_token: str | None = None,
        skills_dir: str | None = None,
    ):
        super().__init__(api_key=None, api_base=None)
        self.cli_path = cli_path
        self.cli_args = cli_args if cli_args is not None else ["copilot"]
        self.default_model = default_model
        self.github_token = github_token
        self.skills_dir = skills_dir

        self._client: Any | None = None
        self._session: Any | None = None
        self.authenticated: bool = False

    # ------------------------------------------------------------------
    # Auth (CopilotAuth pattern)
    # ------------------------------------------------------------------

    def _build_client_opts(self) -> dict:
        """Return kwargs for CopilotClient constructor.

        Priority: agency CLI > github_token > gh session fallback.
        """
        opts: dict = {"log_level": "error"}
        expanded = os.path.expanduser(self.cli_path)

        if os.path.isfile(expanded):
            opts["cli_path"] = expanded
            opts["cli_args"] = self.cli_args
        elif self.github_token:
            opts["github_token"] = self.github_token
        # else: no-op → CopilotClient falls back to active gh session

        return opts

    # ------------------------------------------------------------------
    # Client lifecycle (ManagedCopilotClient pattern)
    # ------------------------------------------------------------------

    async def _start_client(self) -> None:
        """Start CopilotClient with up to MAX_START_RETRIES attempts."""
        from copilot.client import CopilotClient  # type: ignore[import]

        opts = self._build_client_opts()
        for attempt in range(1, MAX_START_RETRIES + 1):
            try:
                self._client = CopilotClient(opts)
                await self._client.start()
                break
            except TimeoutError as exc:
                if attempt == MAX_START_RETRIES:
                    raise RuntimeError("AgencyProvider: CopilotClient failed to start") from exc
                wait = RETRY_BACKOFF_BASE ** attempt
                logger.warning("AgencyProvider: start attempt {}/{} failed, retrying in {}s", attempt, MAX_START_RETRIES, wait)
                await asyncio.sleep(wait)

        await self._verify_auth()
        logger.debug("AgencyProvider: client started (authenticated={})", self.authenticated)

    async def _verify_auth(self) -> None:
        """Check auth status after client start; optimistic on older CLI versions."""
        if not self._client:
            return
        try:
            status = await self._client.get_auth_status()
            self.authenticated = status.isAuthenticated
        except Exception:
            self.authenticated = True   # older CLI versions lack this API

    # ------------------------------------------------------------------
    # Skills
    # ------------------------------------------------------------------

    def _resolve_skill_dirs(self) -> list[str]:
        """Return existing skill directories to pass to the session."""
        dirs: list[str] = []
        if self.skills_dir:
            p = Path(self.skills_dir).expanduser()
            if p.is_dir():
                dirs.append(str(p))
            else:
                logger.debug("AgencyProvider: skills_dir {} does not exist, skipping", self.skills_dir)
        return dirs

    # ------------------------------------------------------------------
    # Session lifecycle
    # ------------------------------------------------------------------

    async def _get_session(self) -> Any:
        """Return (or lazily create) the Agency Copilot session."""
        if self._session is not None:
            return self._session

        if self._client is None:
            await self._start_client()

        skill_dirs = self._resolve_skill_dirs()
        session_cfg: dict[str, Any] = {
            "on_permission_request": lambda *_: {"decision": "allow"},
            "hooks": {"on_pre_tool_use": _auto_approve},
        }
        if skill_dirs:
            session_cfg["skill_directories"] = skill_dirs
            logger.debug("AgencyProvider: loading skills from {}", skill_dirs)

        self._session = await self._client.create_session(session_cfg)
        logger.debug("AgencyProvider: session created")
        return self._session

    async def _reset_session(self) -> None:
        """Close and discard the current session so the next call reconnects."""
        self._session = None
        if self._client is not None:
            try:
                await self._client.stop()
            except Exception:
                pass
            self._client = None
        self.authenticated = False

    # ------------------------------------------------------------------
    # LLMProvider interface
    # ------------------------------------------------------------------

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> LLMResponse:
        """
        Send the latest user message to the Agency Copilot session.

        Agency manages its own conversation memory and tool execution, so only
        the most-recent user turn is forwarded. Any nanobot-level tools list is
        ignored (Agency has its own built-in Copilot tooling).
        """
        if tools:
            logger.debug(
                "AgencyProvider: {} tool definitions received but Agency handles tools internally",
                len(tools),
            )

        prompt = _extract_last_user_message(messages)
        if not prompt:
            return LLMResponse(content="(no user message)", finish_reason="stop")

        effective_model = model or self.default_model

        try:
            reply = await self._send_with_recovery(prompt, effective_model)
            content = reply.data.content if reply else None
            return LLMResponse(content=content, finish_reason="stop")
        except Exception as e:
            logger.error("AgencyProvider error: {}", e)
            await self._reset_session()
            return LLMResponse(
                content=f"Error calling Agency Copilot: {e}",
                finish_reason="error",
            )

    async def _send_with_recovery(self, prompt: str, model: str) -> Any:
        """Send prompt; on 'Session not found' recreate session and retry once."""
        session = await self._get_session()

        # Subscribe event logger for debug observability
        try:
            unsub = session.on(_make_event_logger(model))
        except Exception:
            unsub = None

        try:
            try:
                return await session.send_and_wait({"prompt": prompt})
            except Exception as exc:
                if "Session not found" in str(exc):
                    logger.warning("AgencyProvider: session not found, recreating and retrying")
                    await self._reset_session()
                    session = await self._get_session()
                    try:
                        unsub2 = session.on(_make_event_logger(model))
                    except Exception:
                        unsub2 = None
                    try:
                        return await session.send_and_wait({"prompt": prompt})
                    finally:
                        if unsub2:
                            try:
                                unsub2()
                            except Exception:
                                pass
                else:
                    raise
        finally:
            if unsub:
                try:
                    unsub()
                except Exception:
                    pass

    def get_default_model(self) -> str:
        return self.default_model


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_last_user_message(messages: list[dict[str, Any]]) -> str:
    """Return the text content of the most recent user message."""
    for msg in reversed(messages):
        if msg.get("role") != "user":
            continue
        content = msg.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    parts.append(item.get("text") or "")
            return " ".join(parts).strip()
    return ""
