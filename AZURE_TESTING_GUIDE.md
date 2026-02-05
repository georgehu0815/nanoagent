# Azure OpenAI Integration Testing Guide

This guide provides step-by-step instructions for testing the Azure OpenAI integration with nanobot.

## Prerequisites

### 1. Azure Resources
- Azure OpenAI service endpoint
- Deployment name (e.g., `gpt-5.2-chat`)
- Azure AD authentication configured OR API key

### 2. Required Python Packages
```bash
# Install nanobot with Azure dependencies
uv tool install --editable . --with azure-identity --with openai

# Or with pip
pip install -e ".[azure]"
```

### 3. Test Environment Values
For this test, we'll use:
- **Endpoint**: `https://datacopilothub8882317788.cognitiveservices.azure.com/`
- **Deployment**: `gpt-5.2-chat`
- **API Version**: `2025-01-01-preview`
- **Managed Identity Client ID**: `c9427d44-98e2-406a-9527-f7fa7059f984`

## Test Setup

### Step 1: Verify Installation

```bash
# Check nanobot is installed
which nanobot

# Verify it's the editable install
uv tool list | grep nanobot
# Should show: nanobot-ai==X.X.X (from file:///.../nanobot)
```

### Step 2: Configure nanobot

Create or update `~/.nanobot/config.json` with camelCase keys:

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.nanobot/workspace",
      "model": "azure/gpt-5.2-chat",
      "maxTokens": 8192,
      "temperature": 1.0,
      "maxToolIterations": 20
    }
  },
  "providers": {
    "azure": {
      "apiBase": "https://datacopilothub8882317788.cognitiveservices.azure.com/",
      "apiVersion": "2025-01-01-preview",
      "deployment": "gpt-5.2-chat",
      "useAzureAd": true,
      "apiKey": ""
    }
  }
}
```

**Important Notes:**
- Use **camelCase** keys (`apiBase`, `apiVersion`, not `api_base`, `api_version`)
- Set `temperature: 1.0` (GPT-5.2 only supports default temperature)
- Leave `apiKey` empty if using Azure AD authentication

### Step 3: Set Environment Variables

```bash
# For Managed Identity authentication
export AZURE_CLIENT_ID="c9427d44-98e2-406a-9527-f7fa7059f984"

# Or for Azure CLI authentication
az login
```

## Test Cases

### Test 1: Verify Configuration Loading

**Objective**: Confirm nanobot loads the Azure configuration correctly.

```bash
nanobot status
```

**Expected Output:**
```
🐈 nanobot Status

Config: /Users/username/.nanobot/config.json ✓
Workspace: /Users/username/.nanobot/workspace ✓
Model: azure/gpt-5.2-chat
Azure OpenAI: ✓ gpt-5.2-chat @ https://datacopilothub8882317788.cognitiveservices.azure.com/
OpenRouter API: not set
Anthropic API: not set
OpenAI API: not set
Gemini API: not set
vLLM/Local: not set
```

**Success Criteria:**
- ✅ "Azure OpenAI:" line appears with green checkmark
- ✅ Shows correct deployment name and endpoint
- ✅ Model shows `azure/gpt-5.2-chat`

### Test 2: Basic Agent Query

**Objective**: Test simple query to Azure OpenAI.

```bash
export AZURE_CLIENT_ID="c9427d44-98e2-406a-9527-f7fa7059f984"
nanobot agent -m "What is 2+2?"
```

**Expected Output:**
```
🐈 2 + 2 = **4** ✅
```

**Success Criteria:**
- ✅ Receives response from Azure OpenAI
- ✅ No authentication errors
- ✅ Response is accurate

**Common Issues:**
- ❌ `Error: No API key configured` → Azure not detected, check config file uses camelCase
- ❌ `ModuleNotFoundError: No module named 'azure'` → Install azure-identity package
- ❌ `Error: Unsupported parameter: 'max_tokens'` → Provider using old parameter name
- ❌ `Error: temperature does not support 0.7` → Temperature not set to 1.0

### Test 3: Interactive Mode

**Objective**: Test interactive conversation with the agent.

```bash
export AZURE_CLIENT_ID="c9427d44-98e2-406a-9527-f7fa7059f984"
nanobot agent
```

**Test Interactions:**
1. Ask: `"Hello, what model are you?"`
   - Expected: Response mentioning GPT or Azure OpenAI
2. Ask: `"Can you help me with Python code?"`
   - Expected: Affirmative response
3. Press `Ctrl+C` to exit
   - Expected: Clean exit with "Goodbye!" message

**Success Criteria:**
- ✅ Agent maintains conversation context
- ✅ Responses are coherent and relevant
- ✅ Clean exit on Ctrl+C

### Test 4: Tool Calling

**Objective**: Verify Azure OpenAI can call tools correctly.

```bash
export AZURE_CLIENT_ID="c9427d44-98e2-406a-9527-f7fa7059f984"
nanobot agent -m "What files are in the current directory?"
```

**Expected Behavior:**
- Agent should use the appropriate tool to list files
- Response should include actual files from the directory

**Success Criteria:**
- ✅ Agent attempts to use tools
- ✅ Tool calls are executed successfully
- ✅ Response includes tool output

### Test 5: Gateway Mode

**Objective**: Test running nanobot as a gateway service.

```bash
export AZURE_CLIENT_ID="c9427d44-98e2-406a-9527-f7fa7059f984"
nanobot gateway --port 18790
```

**Expected Output:**
```
🐈 Starting nanobot gateway on port 18790...
[green]✓[/green] Using Azure OpenAI (gpt-5.2-chat)
...
```

**Success Criteria:**
- ✅ Gateway starts without errors
- ✅ Shows "Using Azure OpenAI" message
- ✅ No authentication failures
- ✅ Can be stopped with Ctrl+C

### Test 6: Configuration Validation

**Objective**: Verify the provider configuration is loaded correctly.

```bash
python3 << 'EOF'
from nanobot.config.loader import load_config

config = load_config()
print(f"✓ Model: {config.agents.defaults.model}")
print(f"✓ Azure API Base: {config.providers.azure.api_base}")
print(f"✓ Azure Deployment: {config.providers.azure.deployment}")
print(f"✓ Azure API Version: {config.providers.azure.api_version}")
print(f"✓ Use Azure AD: {config.providers.azure.use_azure_ad}")
print(f"✓ Is Azure Configured: {config.is_azure_configured()}")
EOF
```

**Expected Output:**
```
✓ Model: azure/gpt-5.2-chat
✓ Azure API Base: https://datacopilothub8882317788.cognitiveservices.azure.com/
✓ Azure Deployment: gpt-5.2-chat
✓ Azure API Version: 2025-01-01-preview
✓ Use Azure AD: True
✓ Is Azure Configured: True
```

**Success Criteria:**
- ✅ All configuration values match expected values
- ✅ `is_azure_configured()` returns `True`

### Test 7: Error Handling

**Objective**: Verify graceful error handling with invalid configuration.

**Test 7a: Invalid Endpoint**
```bash
# Temporarily modify config with invalid endpoint
# Expected: Clear error message about connection failure
```

**Test 7b: Wrong Deployment Name**
```bash
# Use non-existent deployment name
# Expected: Error message about deployment not found
```

**Test 7c: Missing Authentication**
```bash
# Unset AZURE_CLIENT_ID and logout from az cli
unset AZURE_CLIENT_ID
az logout
nanobot agent -m "test"
# Expected: Authentication error with helpful message
```

## Code Testing

### Test 8: Provider Unit Test

**Objective**: Test the AzureOpenAIProvider class directly.

Create `test_azure_provider.py`:

```python
import asyncio
from nanobot.providers.azure_provider import AzureOpenAIProvider

async def test_provider():
    provider = AzureOpenAIProvider(
        api_base="https://datacopilothub8882317788.cognitiveservices.azure.com/",
        api_version="2025-01-01-preview",
        deployment="gpt-5.2-chat",
        use_azure_ad=True,
    )

    messages = [{"role": "user", "content": "Say hello"}]
    response = await provider.chat(messages)

    print(f"✓ Response received: {response.content[:50]}...")
    print(f"✓ Finish reason: {response.finish_reason}")
    assert response.content, "Response should have content"
    assert response.finish_reason == "stop", "Should finish normally"
    print("✓ All provider tests passed")

if __name__ == "__main__":
    import os
    os.environ["AZURE_CLIENT_ID"] = "c9427d44-98e2-406a-9527-f7fa7059f984"
    asyncio.run(test_provider())
```

Run the test:
```bash
python test_azure_provider.py
```

**Success Criteria:**
- ✅ Provider initializes without errors
- ✅ Chat request completes successfully
- ✅ Response contains content
- ✅ Finish reason is "stop"

## Troubleshooting Guide

### Issue: "No API key configured"

**Symptoms:**
```
Error: No API key configured.
```

**Root Cause**: `is_azure_configured()` returns `False`

**Solutions:**
1. Verify config file uses **camelCase** keys:
   ```json
   "apiBase": "...",  // ✓ Correct
   "api_base": "...", // ✗ Wrong
   ```

2. Check `apiBase` is not empty:
   ```bash
   cat ~/.nanobot/config.json | grep apiBase
   ```

3. Reinstall with editable mode:
   ```bash
   uv tool install --force --editable .
   ```

### Issue: "ModuleNotFoundError: No module named 'azure'"

**Symptoms:**
```
ModuleNotFoundError: No module named 'azure'
```

**Root Cause**: Azure dependencies not installed

**Solution:**
```bash
uv tool install --force --editable . --with azure-identity --with openai
```

### Issue: "Unsupported parameter: 'max_tokens'"

**Symptoms:**
```
Error: Unsupported parameter: 'max_tokens' is not supported with this model.
Use 'max_completion_tokens' instead.
```

**Root Cause**: Using old parameter name for newer models

**Solution**: Verify [azure_provider.py:89](nanobot/providers/azure_provider.py#L89) uses:
```python
"max_completion_tokens": max_tokens,  # ✓ Correct for GPT-5.2
```

### Issue: "temperature does not support 0.7"

**Symptoms:**
```
Error: Unsupported value: 'temperature' does not support 0.7 with this model.
Only the default (1) value is supported.
```

**Root Cause**: GPT-5.2 only supports default temperature

**Solutions:**
1. Update config file temperature to `1.0`
2. Verify [azure_provider.py:64](nanobot/providers/azure_provider.py#L64) defaults to `1.0`
3. Check [azure_provider.py:93](nanobot/providers/azure_provider.py#L93) only sends temperature if not default

### Issue: Authentication Failures

**Symptoms:**
```
DefaultAzureCredential failed to retrieve a token
```

**Solutions:**
1. Set managed identity client ID:
   ```bash
   export AZURE_CLIENT_ID="c9427d44-98e2-406a-9527-f7fa7059f984"
   ```

2. Or use Azure CLI:
   ```bash
   az login
   az account show
   ```

3. Or use API key instead:
   ```json
   {
     "providers": {
       "azure": {
         "useAzureAd": false,
         "apiKey": "your-api-key-here"
       }
     }
   }
   ```

## Test Checklist

Use this checklist to verify all tests pass:

- [ ] **Setup**
  - [ ] Dependencies installed
  - [ ] Config file created with camelCase keys
  - [ ] Environment variables set

- [ ] **Basic Tests**
  - [ ] Test 1: Configuration loading ✓
  - [ ] Test 2: Basic agent query ✓
  - [ ] Test 3: Interactive mode ✓

- [ ] **Advanced Tests**
  - [ ] Test 4: Tool calling ✓
  - [ ] Test 5: Gateway mode ✓
  - [ ] Test 6: Configuration validation ✓

- [ ] **Error Handling**
  - [ ] Test 7a: Invalid endpoint ✓
  - [ ] Test 7b: Wrong deployment ✓
  - [ ] Test 7c: Missing authentication ✓

- [ ] **Code Tests**
  - [ ] Test 8: Provider unit test ✓

## Development Workflow

### Making Code Changes

Since you're using an **editable install**, most changes take effect immediately:

```bash
# 1. Edit Python files
vim nanobot/providers/azure_provider.py

# 2. Test immediately (no reinstall needed)
nanobot agent -m "test"
```

### When Reinstall is Required

Reinstall only when:
- Adding new dependencies to `pyproject.toml`
- Changing package entry points
- Modifying package metadata

```bash
uv tool install --force --editable . --with azure-identity --with openai
```

### Running Tests Without Installation

You can also run directly from the repo:

```bash
# From repo root
python -m nanobot.cli.commands agent -m "test"
```

## Performance Benchmarks

Track these metrics during testing:

| Test Case | Expected Time | Actual Time | Status |
|-----------|---------------|-------------|--------|
| Simple query | < 3 seconds | | |
| Tool calling | < 5 seconds | | |
| Gateway startup | < 2 seconds | | |
| Config reload | < 100ms | | |

## Test Report Template

```markdown
# Azure OpenAI Integration Test Report

**Date**: YYYY-MM-DD
**Tester**: [Your Name]
**Environment**: [Dev/Staging/Production]

## Configuration
- Endpoint: https://datacopilothub8882317788.cognitiveservices.azure.com/
- Deployment: gpt-5.2-chat
- API Version: 2025-01-01-preview
- Auth Method: [Azure AD / API Key]

## Test Results
- [ ] All tests passed
- [ ] Some tests failed (see below)
- [ ] Tests blocked (see notes)

### Failed Tests
[List any failed tests and details]

### Notes
[Additional observations]

### Recommendations
[Suggested improvements or fixes]
```

## Additional Resources

- [Azure OpenAI Guide](AZURE_OPENAI_GUIDE.md) - Full configuration documentation
- [nanobot/providers/azure_provider.py](nanobot/providers/azure_provider.py) - Provider implementation
- [nanobot/config/schema.py](nanobot/config/schema.py) - Configuration schema
- [Azure OpenAI Documentation](https://learn.microsoft.com/azure/ai-services/openai/)

## Support

For issues or questions:
1. Check the [Troubleshooting Guide](#troubleshooting-guide)
2. Review test output and logs
3. Verify configuration matches this guide
4. Check Azure Portal for service status

---

**Last Updated**: 2026-02-04
**Test Environment**: GPT-5.2-chat on Azure OpenAI
