"""WebSocket gateway channel for web browser clients."""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Any

from loguru import logger

from nanobot.bus.events import OutboundMessage
from nanobot.bus.queue import MessageBus
from nanobot.channels.base import BaseChannel


class WebChannel(BaseChannel):
    """
    WebSocket server channel for web browser clients.

    Implements the nanobot gateway WebSocket protocol:
      - Frame model: req / res / event
      - Methods: connect, chat.send, chat.history, chat.abort, health
      - Agent events  → stream: "tool" | "lifecycle"
      - Chat events   → state: "final"  (carries the assistant reply)

    Multiple browser tabs can connect simultaneously; each is identified
    by its sessionKey (e.g. "agent:main:webapp-<timestamp>").
    """

    name = "web"

    def __init__(self, config: Any, bus: MessageBus) -> None:
        super().__init__(config, bus)
        # sessionKey → websocket connection
        self._clients: dict[str, Any] = {}
        self._stop_event: asyncio.Event | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Start the WebSocket server and block until stopped."""
        from websockets.asyncio.server import serve

        self._running = True
        self._stop_event = asyncio.Event()

        host: str = getattr(self.config, "host", "0.0.0.0")
        port: int = getattr(self.config, "port", 18789)

        logger.info("Web channel: starting WebSocket server on {}:{}", host, port)

        async with serve(self._handle_client, host, port):
            logger.info("Web channel: WebSocket server ready → ws://{}:{}", host, port)
            await self._stop_event.wait()

        logger.info("Web channel: WebSocket server stopped")

    async def stop(self) -> None:
        """Stop the server and close all open connections."""
        self._running = False
        if self._stop_event:
            self._stop_event.set()

        for ws in list(self._clients.values()):
            try:
                await ws.close()
            except Exception:
                pass
        self._clients.clear()

    # ------------------------------------------------------------------
    # Outbound: agent → webapp
    # ------------------------------------------------------------------

    async def send(self, msg: OutboundMessage) -> None:
        """Route an outbound message to the correct WebSocket client."""
        ws = self._clients.get(msg.chat_id)
        if ws is None:
            logger.warning("Web channel: no client registered for session '{}'", msg.chat_id)
            return

        is_progress = bool(msg.metadata.get("_progress"))

        if is_progress:
            frame: dict = {
                "type": "event",
                "event": "agent",
                "payload": {
                    "stream": "tool",
                    "sessionKey": msg.chat_id,
                    "data": {
                        "phase": "progress",
                        "message": msg.content,
                    },
                    "ts": _now_ms(),
                },
            }
        else:
            frame = {
                "type": "event",
                "event": "chat",
                "payload": {
                    "state": "final",
                    "sessionKey": msg.chat_id,
                    "message": {
                        "role": "assistant",
                        "content": [{"type": "text", "text": msg.content}],
                        "timestamp": _now_ms(),
                    },
                    "ts": _now_ms(),
                },
            }

        try:
            await ws.send(json.dumps(frame))
        except Exception as exc:
            logger.error("Web channel: send error for '{}': {}", msg.chat_id, exc)
            self._clients.pop(msg.chat_id, None)

    # ------------------------------------------------------------------
    # Inbound: webapp → agent
    # ------------------------------------------------------------------

    async def _handle_client(self, websocket: Any) -> None:
        """Handle a single WebSocket client for its entire lifetime."""
        client_id = uuid.uuid4().hex[:8]
        registered_sessions: list[str] = []

        logger.info("Web channel: client {} connected", client_id)

        try:
            async for raw in websocket:
                try:
                    frame = json.loads(raw)
                except json.JSONDecodeError:
                    logger.warning("Web channel: invalid JSON from client {}", client_id)
                    continue

                if frame.get("type") != "req":
                    continue

                method: str = frame.get("method", "")
                params: dict = frame.get("params") or {}
                req_id: str = frame.get("id", "")

                await self._dispatch(
                    websocket, client_id, method, params, req_id, registered_sessions
                )

        except Exception as exc:
            logger.error("Web channel: client {} error: {}", client_id, exc)
        finally:
            for session_key in registered_sessions:
                if self._clients.get(session_key) is websocket:
                    self._clients.pop(session_key, None)
            logger.info("Web channel: client {} disconnected", client_id)

    async def _dispatch(
        self,
        websocket: Any,
        client_id: str,
        method: str,
        params: dict,
        req_id: str,
        registered_sessions: list[str],
    ) -> None:
        """Dispatch a single request frame to the appropriate handler."""
        if method == "connect":
            await self._handle_connect(websocket, client_id, params, req_id)

        elif method == "chat.send":
            await self._handle_chat_send(
                websocket, client_id, params, req_id, registered_sessions
            )

        elif method == "chat.abort":
            await self._res(websocket, req_id, ok=True, payload={})

        elif method == "chat.history":
            await self._res(websocket, req_id, ok=True, payload={"messages": []})

        elif method == "health":
            await self._res(
                websocket, req_id, ok=True, payload={"status": "ok", "channel": "web"}
            )

        else:
            await self._res(
                websocket, req_id, ok=False, error={"message": f"Unknown method: {method}"}
            )

    async def _handle_connect(
        self, websocket: Any, client_id: str, params: dict, req_id: str
    ) -> None:
        """Negotiate the connection and validate optional auth token."""
        token: str = getattr(self.config, "token", "") or ""
        if token:
            auth: dict = params.get("auth") or {}
            if auth.get("token", "") != token:
                await self._res(
                    websocket, req_id, ok=False, error={"message": "Invalid auth token"}
                )
                return

        await self._res(
            websocket,
            req_id,
            ok=True,
            payload={"protocol": 3, "server": "nanobot", "version": "1.0.0"},
        )
        logger.info("Web channel: client {} authenticated (protocol v3)", client_id)

    async def _handle_chat_send(
        self,
        websocket: Any,
        client_id: str,
        params: dict,
        req_id: str,
        registered_sessions: list[str],
    ) -> None:
        """Accept a chat message and forward it to the agent via the bus."""
        session_key: str = params.get("sessionKey", "").strip()
        content: str = params.get("message", "").strip()

        if not session_key or not content:
            await self._res(
                websocket,
                req_id,
                ok=False,
                error={"message": "sessionKey and message are required"},
            )
            return

        # Register / update the client so outbound messages can be routed back
        self._clients[session_key] = websocket
        if session_key not in registered_sessions:
            registered_sessions.append(session_key)

        run_id = uuid.uuid4().hex[:8]

        # Acknowledge the request immediately
        await self._res(
            websocket, req_id, ok=True, payload={"runId": run_id, "sessionId": session_key}
        )

        # Tell the webapp the agent is starting
        await websocket.send(
            json.dumps({
                "type": "event",
                "event": "agent",
                "payload": {
                    "stream": "lifecycle",
                    "data": {"phase": "start"},
                    "sessionKey": session_key,
                    "runId": run_id,
                    "ts": _now_ms(),
                },
            })
        )

        # Publish to the message bus — the agent will consume and respond
        await self._handle_message(
            sender_id=client_id,
            chat_id=session_key,
            content=content,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def _res(
        websocket: Any,
        req_id: str,
        *,
        ok: bool,
        payload: dict | None = None,
        error: dict | None = None,
    ) -> None:
        frame: dict = {"type": "res", "id": req_id, "ok": ok}
        if payload is not None:
            frame["payload"] = payload
        if error is not None:
            frame["error"] = error
        await websocket.send(json.dumps(frame))


def _now_ms() -> int:
    return int(time.time() * 1000)
