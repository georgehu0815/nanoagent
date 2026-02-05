# Azure OpenAI Integration Guide

This guide explains how to use Azure OpenAI and GPT models as the default LLM provider in nanobot.

## Overview

The nanobot framework now supports Azure OpenAI as the primary LLM provider with full support for:
- Azure AD authentication (DefaultAzureCredential)
- API key authentication
- Custom deployments and API versions
- GPT-4o and other Azure OpenAI models

## Changes Made

### 1. Schema Updates ([nanobot/config/schema.py](nanobot/config/schema.py))

Added Azure provider configuration:
```python
class AzureProviderConfig(BaseModel):
    """Azure OpenAI provider configuration."""
    api_key: str = ""  # Optional, uses Azure AD if not provided
    api_base: str = ""  # Azure endpoint
    api_version: str = "2025-01-01-preview"
    deployment: str = "gpt-5.2-chat"  # Default deployment name
    use_azure_ad: bool = True  # Use Azure AD authentication by default
```

Updated default model:
```python
model: str = "azure/gpt-5.2-chat"  # Changed from anthropic/claude-opus-4-5
```

### 2. New Azure Provider ([nanobot/providers/azure_provider.py](nanobot/providers/azure_provider.py))

Created `AzureOpenAIProvider` class with:
- Azure AD authentication via `DefaultAzureCredential`
- Fallback to API key authentication
- Full support for tool calling
- Compatible with OpenAI API format

### 3. CLI Updates ([nanobot/cli/commands.py](nanobot/cli/commands.py))

Both `gateway` and `agent` commands now:
1. Check if Azure is configured
2. Use `AzureOpenAIProvider` if Azure is set up
3. Fall back to `LiteLLMProvider` for other providers

## Configuration

### Using Values from utils.py

Based on your [nanobot/providers/utils.py](nanobot/providers/utils.py) file, configure Azure OpenAI by editing `~/.nanobot/config.json`:

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.nanobot/workspace",
      "model": "azure/gpt-5.2-chat",
      "max_tokens": 8192,
      "temperature": 0.7,
      "max_tool_iterations": 20
    }
  },
  "providers": {
    "azure": {
      "api_base": "https://datacopilothub8882317788.cognitiveservices.azure.com/",
      "api_version": "2025-01-01-preview",
      "deployment": "gpt-5.2-chat",
      "use_azure_ad": true,
      "api_key": ""
    }
  }
}
```

### Configuration Options

#### Option 1: Azure AD Authentication (Recommended)
```json
{
  "providers": {
    "azure": {
      "api_base": "https://YOUR_RESOURCE.cognitiveservices.azure.com/",
      "api_version": "2025-01-01-preview",
      "deployment": "gpt-5.2-chat",
      "use_azure_ad": true,
      "api_key": ""
    }
  }
}
```

This uses `DefaultAzureCredential` which automatically detects:
- Azure CLI credentials (`az login`)
- Managed Identity
- Environment variables
- Visual Studio Code credentials
- And more...

#### Option 2: API Key Authentication
```json
{
  "providers": {
    "azure": {
      "api_base": "https://YOUR_RESOURCE.cognitiveservices.azure.com/",
      "api_version": "2025-01-01-preview",
      "deployment": "gpt-5.2-chat",
      "use_azure_ad": false,
      "api_key": "your-api-key-here"
    }
  }
}
```

### Available Deployments

Common Azure OpenAI deployments you can use:
- `gpt-5.2-chat` - GPT-5.2 Chat (default)
- `gpt-4o` - GPT-4 Optimized
- `gpt-4o-2` - GPT-4 Optimized (version 2)
- `gpt-4o-mini` - Smaller, faster GPT-4
- `gpt-4` - Standard GPT-4
- `gpt-35-turbo` - GPT-3.5 Turbo

Update the `deployment` field to match your Azure OpenAI deployment name.

## Usage

### 1. Check Status

Verify your Azure OpenAI configuration:

```bash
nanobot status
```

Expected output:
```
🤖 nanobot Status

Config: /Users/username/.nanobot/config.json ✓
Workspace: /Users/username/.nanobot/workspace ✓
Model: azure/gpt-5.2-chat
Azure OpenAI: ✓ gpt-5.2-chat @ https://datacopilothub8882317788.cognitiveservices.azure.com/
```

### 2. Run Agent

```bash
# Single message
nanobot agent -m "Hello, what model are you?"

# Interactive mode
nanobot agent
```

### 3. Start Gateway

```bash
nanobot gateway --port 18790
```

You should see:
```
🤖 Starting nanobot gateway on port 18790...
✓ Using Azure OpenAI (gpt-5.2-chat)
```

## Azure AD Authentication Setup

### Prerequisites

Install Azure Identity:
```bash
pip install azure-identity
```

### Authentication Methods

The `DefaultAzureCredential` tries these methods in order:

1. **Environment Variables**
   ```bash
   export AZURE_CLIENT_ID="c9427d44-98e2-406a-9527-f7fa7059f984"  # Managed Identity Client ID
   export AZURE_TENANT_ID="<your-tenant-id>"
   export AZURE_CLIENT_SECRET="<your-client-secret>"  # Only for service principal
   ```

2. **Azure CLI**
   ```bash
   az login
   ```

3. **Managed Identity** (when running in Azure)
   - Automatically detected in Azure VMs, App Service, Functions, etc.

4. **Visual Studio Code**
   - Authenticate through VS Code Azure extension

### Testing Authentication

Test your Azure credentials:
```bash
az login
az account show
```

## Environment Variables

You can also configure via environment variables:

```bash
# Azure OpenAI settings
export NANOBOT_PROVIDERS__AZURE__API_BASE="https://YOUR_RESOURCE.cognitiveservices.azure.com/"
export NANOBOT_PROVIDERS__AZURE__API_VERSION="2025-01-01-preview"
export NANOBOT_PROVIDERS__AZURE__DEPLOYMENT="gpt-5.2-chat"
export NANOBOT_PROVIDERS__AZURE__USE_AZURE_AD="true"

# Azure AD Managed Identity (optional)
export AZURE_CLIENT_ID="c9427d44-98e2-406a-9527-f7fa7059f984"

# Or with API key
export NANOBOT_PROVIDERS__AZURE__API_KEY="your-key-here"
export NANOBOT_PROVIDERS__AZURE__USE_AZURE_AD="false"
```

## Troubleshooting

### Error: "No API key configured"

**Solution:** Ensure `api_base` is set in the Azure provider config:
```json
{
  "providers": {
    "azure": {
      "api_base": "https://YOUR_RESOURCE.cognitiveservices.azure.com/"
    }
  }
}
```

### Error: "DefaultAzureCredential failed to retrieve a token"

**Solutions:**
1. Run `az login` to authenticate with Azure CLI
2. Set environment variables for service principal
3. Set `use_azure_ad: false` and provide an `api_key`

### Error: "Resource not found" or "Deployment not found"

**Solution:** Verify your deployment name matches your Azure OpenAI resource:
```bash
# List your deployments
az cognitiveservices account deployment list \
  --name YOUR_RESOURCE_NAME \
  --resource-group YOUR_RESOURCE_GROUP
```

### Model returns errors about tool calling

**Solution:** Ensure you're using API version `2024-06-01` or later:
```json
{
  "providers": {
    "azure": {
      "api_version": "2025-01-01-preview"
    }
  }
}
```

### Using o3-mini model

If you want to use the o3-mini model (as referenced in utils.py):

```json
{
  "agents": {
    "defaults": {
      "model": "azure/o3-mini"
    }
  },
  "providers": {
    "azure": {
      "api_base": "https://datacopilothub8882317788.cognitiveservices.azure.com/",
      "api_version": "2024-12-01-preview",
      "deployment": "o3-mini",
      "use_azure_ad": true
    }
  }
}
```

## Code Reference

### Using Azure Provider Directly

```python
from nanobot.providers.azure_provider import AzureOpenAIProvider

# With Azure AD
provider = AzureOpenAIProvider(
    api_base="https://YOUR_RESOURCE.cognitiveservices.azure.com/",
    api_version="2025-01-01-preview",
    deployment="gpt-5.2-chat",
    use_azure_ad=True
)

# With API key
provider = AzureOpenAIProvider(
    api_key="your-api-key",
    api_base="https://YOUR_RESOURCE.cognitiveservices.azure.com/",
    api_version="2025-01-01-preview",
    deployment="gpt-5.2-chat",
    use_azure_ad=False
)

# Send a message
response = await provider.chat(
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=1000,
    temperature=0.7
)

print(response.content)
```

### Switching Between Providers

To temporarily use a different provider without changing config:

```python
from nanobot.config.loader import load_config

config = load_config()

# Disable Azure
config.providers.azure.api_base = ""

# Now will fall back to LiteLLM with other configured providers
```

## Additional Resources

- [Azure OpenAI Service Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Azure Identity Python SDK](https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme)
- [nanobot Documentation](https://github.com/HKUDS/nanobot)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review your Azure OpenAI resource in Azure Portal
3. Verify authentication with `az login`
4. Check logs with `nanobot gateway --verbose`

---

**Last Updated:** 2026-02-04
**Default Model:** azure/gpt-5.2-chat
**Default Deployment:** gpt-5.2-chat
**API Version:** 2025-01-01-preview
**Endpoint:** https://datacopilothub8882317788.cognitiveservices.azure.com/
**Managed Identity Client ID:** c9427d44-98e2-406a-9527-f7fa7059f984
**Authentication:** Azure AD (DefaultAzureCredential)
