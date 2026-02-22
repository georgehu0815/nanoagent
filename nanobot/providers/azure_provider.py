"""Azure OpenAI provider implementation with Azure AD authentication."""

from typing import Any

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI

from nanobot.providers.base import LLMProvider, LLMResponse, ToolCallRequest


class AzureOpenAIProvider(LLMProvider):
    """
    Azure OpenAI provider with support for Azure AD authentication.

    Supports both API key and Azure AD token-based authentication.
    """

    def __init__(
        self,
        api_key: str | None = None,
        api_base: str | None = None,
        api_version: str = "2025-01-01-preview",
        deployment: str = "gpt-5.2-chat",
        use_azure_ad: bool = True,
    ):
        super().__init__(api_key, api_base)
        self.api_version = api_version
        self.deployment = deployment
        self.use_azure_ad = use_azure_ad

        # Set up Azure AD token provider if needed
        self.token_provider = None
        if self.use_azure_ad and not api_key:
            self.token_provider = get_bearer_token_provider(
                DefaultAzureCredential(),
                "https://cognitiveservices.azure.com/.default"
            )

        # Client is created lazily on first use to avoid event-loop binding issues
        # when the provider is instantiated before asyncio.run() starts.
        self._client: AsyncAzureOpenAI | None = None

    def _get_client(self) -> AsyncAzureOpenAI:
        """Return the Azure OpenAI client, creating it on first call."""
        if self._client is None:
            kwargs: dict = {
                "api_version": self.api_version,
                "azure_endpoint": self.api_base,
            }
            if self.token_provider:
                kwargs["azure_ad_token_provider"] = self.token_provider
            elif self.api_key:
                kwargs["api_key"] = self.api_key
            else:
                raise ValueError("Either api_key or Azure AD authentication must be configured")
            self._client = AsyncAzureOpenAI(**kwargs)
        return self._client

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 1.0,
    ) -> LLMResponse:
        """
        Send a chat completion request to Azure OpenAI.

        Args:
            messages: List of message dicts with 'role' and 'content'.
            tools: Optional list of tool definitions in OpenAI format.
            model: Deployment name (overrides default deployment).
            max_tokens: Maximum tokens in response.
            temperature: Sampling temperature.

        Returns:
            LLMResponse with content and/or tool calls.
        """
        # Use provided model/deployment or fall back to default
        deployment = model or self.deployment

        # Remove azure/ prefix if present (for compatibility)
        if deployment.startswith("azure/"):
            deployment = deployment[6:]

        kwargs: dict[str, Any] = {
            "model": deployment,
            "messages": messages,
            "max_completion_tokens": max_tokens,  # Use max_completion_tokens for newer models
        }

        # Only include temperature if it's not the default (1.0) since some models don't support it
        if temperature != 1.0:
            kwargs["temperature"] = temperature

        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        try:
            response = await self._get_client().chat.completions.create(**kwargs)
            return self._parse_response(response)
        except Exception as e:
            import traceback
            from loguru import logger
            logger.error("Azure OpenAI error:\n{}", traceback.format_exc())
            return LLMResponse(
                content=f"Error calling Azure OpenAI: {str(e)}",
                finish_reason="error",
            )

    def _parse_response(self, response: Any) -> LLMResponse:
        """Parse Azure OpenAI response into our standard format."""
        choice = response.choices[0]
        message = choice.message

        tool_calls = []
        if hasattr(message, "tool_calls") and message.tool_calls:
            for tc in message.tool_calls:
                # Parse arguments from JSON string if needed
                args = tc.function.arguments
                if isinstance(args, str):
                    import json
                    try:
                        args = json.loads(args)
                    except json.JSONDecodeError:
                        args = {"raw": args}

                tool_calls.append(ToolCallRequest(
                    id=tc.id,
                    name=tc.function.name,
                    arguments=args,
                ))

        usage = {}
        if hasattr(response, "usage") and response.usage:
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }

        return LLMResponse(
            content=message.content,
            tool_calls=tool_calls,
            finish_reason=choice.finish_reason or "stop",
            usage=usage,
        )

    def get_default_model(self) -> str:
        """Get the default deployment name."""
        return self.deployment
