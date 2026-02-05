# Telegram Bot Integration Guide

This guide explains how to create and connect a Telegram bot to nanobot, enabling you to chat with your AI assistant via Telegram.

## Overview

The nanobot Telegram integration provides:
- Direct messaging with your AI assistant via Telegram
- Access to all nanobot features from any device with Telegram
- Tool usage and command execution through chat
- User access control by Telegram ID or username
- Group chat support (optional)
- Inline queries (future enhancement)

## Architecture

```
┌─────────────┐      HTTPS          ┌──────────────┐      Webhook/Poll    ┌─────────────┐
│  Telegram   │ ◄─────────────────► │   nanobot    │ ◄──────────────────► │  Telegram   │
│   Client    │                      │   Gateway    │                      │   API       │
│ (Phone/Web) │                      │              │                      │   Servers   │
└─────────────┘                      └──────────────┘                      └─────────────┘
                                             │
                                      ┌──────▼───────┐
                                      │ Azure OpenAI │
                                      │  (GPT-5.2)   │
                                      └──────────────┘
```

## Prerequisites

### 1. Requirements
- A Telegram account
- nanobot installed and configured
- Azure OpenAI or other LLM provider configured

### 2. Verify Installation
```bash
# Check nanobot is installed
nanobot status

# Should show Azure OpenAI configured
```

## Quick Start

### Step 1: Create a Telegram Bot

1. **Open Telegram** and search for [@BotFather](https://t.me/botfather)

2. **Start a conversation** with BotFather

3. **Create a new bot:**
   ```
   /newbot
   ```

4. **Follow the prompts:**
   ```
   BotFather: Alright, a new bot. How are we going to call it?
   You: My Nanobot Assistant

   BotFather: Good. Now let's choose a username for your bot.
            It must end in `bot`. Like this, for example: TetrisBot
   You: my_nanobot_assistant_bot

   BotFather: Done! Congratulations on your new bot.
   ```

5. **Save the token:** BotFather will give you a token like:
   ```
8201530157:AAGGTo9lCRwYK26gJf_cLCgODsazSnyGPGk
   ```

   **⚠️ Keep this token secret!** Anyone with this token can control your bot.

### Step 2: Configure nanobot

Edit `~/.nanobot/config.json` and add your Telegram configuration:

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
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "8201530157:AAGGTo9lCRwYK26gJf_cLCgODsazSnyGPGk",
      "allowFrom": []
    },
    "whatsapp": {
      "enabled": false,
      "bridgeUrl": "ws://localhost:3001",
      "allowFrom": []
    }
  },
  "providers": {
    "azure": {
      "apiBase": "https://your-endpoint.cognitiveservices.azure.com/",
      "apiVersion": "2025-01-01-preview",
      "deployment": "gpt-5.2-chat",
      "useAzureAd": true,
      "apiKey": ""
    }
  }
}
```

**Important**:
- Use **camelCase** for keys (`allowFrom`, not `allow_from`)
- Replace the token with your actual bot token from BotFather
- Leave `allowFrom` empty to allow anyone (or add restrictions - see below)

### Step 3: Start the Gateway

```bash
# Set Azure credentials
export AZURE_CLIENT_ID="c9427d44-98e2-406a-9527-f7fa7059f984"

# Start nanobot gateway
nanobot gateway --port 18790
```

Expected output:
```
🐈 Starting nanobot gateway on port 18790...
✓ Using Azure OpenAI (gpt-5.2-chat)
✓ Channels enabled: telegram
✓ Telegram bot started (@my_nanobot_assistant_bot)
✓ Heartbeat: every 30m
```

### Step 4: Test Your Bot

1. **Find your bot** in Telegram by searching for its username: `@my_nanobot_assistant_bot`

2. **Start a conversation:**
   ```
   /start
   ```

3. **Send a test message:**
   ```
   Hello! What can you do?
   ```

4. **The bot should respond** using Azure OpenAI! 🎉

## Configuration Options

### Basic Configuration

Minimal Telegram configuration:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": []
    }
  }
}
```

### Restricted Access by User ID

Only allow specific Telegram users (recommended for security):

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": ["123456789", "987654321"]
    }
  }
}
```

**How to find your Telegram User ID:**

1. Message [@userinfobot](https://t.me/userinfobot)
2. It will reply with your User ID
3. Add that ID to `allowFrom`

### Restricted Access by Username

Allow by Telegram username:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": ["@john_doe", "@jane_smith"]
    }
  }
}
```

**Note**: Usernames must include the `@` prefix.

### Mixed Access Control

Allow both user IDs and usernames:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": ["123456789", "@john_doe"]
    }
  }
}
```

## Bot Configuration with BotFather

After creating your bot, you can customize it using BotFather commands:

### Set Bot Description

```
/setdescription @my_nanobot_assistant_bot

I'm an AI assistant powered by Azure OpenAI. I can help you with:
• Answering questions
• Writing code
• File operations
• Running commands
• And much more!
```

### Set Bot About Text

```
/setabouttext @my_nanobot_assistant_bot

AI Assistant powered by nanobot and Azure OpenAI GPT-5.2
```

### Set Bot Profile Picture

```
/setuserpic @my_nanobot_assistant_bot
# Then upload an image
```

### Set Bot Commands

```
/setcommands @my_nanobot_assistant_bot

start - Start the bot
help - Show available commands
status - Check bot status
model - Show current AI model
workspace - View workspace location
```

### Enable Inline Mode (Optional)

```
/setinline @my_nanobot_assistant_bot

# Enable inline queries
```

### Privacy Settings

```
/setprivacy @my_nanobot_assistant_bot

# Choose: Enable or Disable
# Disable = bot can read all messages in groups
# Enable = bot only sees commands and @mentions
```

## Usage Examples

### Basic Conversation

```
You: Hello! What's 2+2?
Bot: 2 + 2 = **4** ✅

You: Can you help me write Python code?
Bot: Of course! What kind of Python code would you like me to help you with?

You: A function to check if a number is prime
Bot: Here's a function to check if a number is prime:

def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

# Usage
print(is_prime(17))  # True
print(is_prime(4))   # False
```

### Using Commands

```
You: /start
Bot: Welcome! I'm your AI assistant. How can I help you today?

You: /help
Bot: Available commands:
     /start - Start the bot
     /help - Show this help message
     /status - Check bot status
     /model - Show current AI model

     You can also just chat with me naturally!

You: /status
Bot: ✅ Status: Online
     🤖 Model: Azure OpenAI GPT-5.2
     📁 Workspace: ~/.nanobot/workspace

You: /model
Bot: Current model: azure/gpt-5.2-chat
     Provider: Azure OpenAI
     API Version: 2025-01-01-preview
```

### Tool Usage

```
You: What files are in my workspace?
Bot: [Bot uses file listing tool]
     📂 Files in workspace:
     • project.py
     • README.md
     • config.json
     • test.py

You: Show me the contents of README.md
Bot: [Bot reads the file]
     # My Project

     This is a sample project...
```

### Code Execution

```
You: Run this Python code: print("Hello from Telegram!")
Bot: [Bot executes the code]
     Output:
     Hello from Telegram!

You: Calculate the factorial of 5
Bot: The factorial of 5 is 120

     5! = 5 × 4 × 3 × 2 × 1 = 120
```

### Multi-turn Conversations

The bot maintains context:

```
You: I'm working on a Python project
Bot: That's great! What kind of Python project are you working on?

You: A web scraper
Bot: Web scraping is useful! What website are you trying to scrape?

You: I need to scrape product prices
Bot: For scraping product prices, I recommend using:
     • BeautifulSoup4 for HTML parsing
     • Requests for HTTP requests
     • Or Scrapy for more complex scraping

     Would you like me to help you write the code?
```

## Advanced Features

### Running as a Service

To keep your bot online 24/7:

#### Using systemd (Linux)

Create `/etc/systemd/system/nanobot-telegram.service`:

```ini
[Unit]
Description=Nanobot Telegram Gateway
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username
Environment="AZURE_CLIENT_ID=your-client-id"
ExecStart=/home/your-username/.local/bin/nanobot gateway --port 18790
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable nanobot-telegram
sudo systemctl start nanobot-telegram
sudo systemctl status nanobot-telegram
```

#### Using screen

```bash
screen -S nanobot-telegram
export AZURE_CLIENT_ID="your-client-id"
nanobot gateway --port 18790

# Detach: Ctrl+A, then D
# Reattach: screen -r nanobot-telegram
```

#### Using tmux

```bash
tmux new -s nanobot-telegram
export AZURE_CLIENT_ID="your-client-id"
nanobot gateway --port 18790

# Detach: Ctrl+B, then D
# Reattach: tmux attach -t nanobot-telegram
```

#### Using Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

RUN pip install nanobot-ai

COPY config.json /root/.nanobot/config.json

ENV AZURE_CLIENT_ID=""

CMD ["nanobot", "gateway", "--port", "18790"]
```

Build and run:
```bash
docker build -t nanobot-telegram .
docker run -d --name nanobot-telegram \
  -e AZURE_CLIENT_ID="your-client-id" \
  nanobot-telegram
```

### Group Chat Support

To use your bot in Telegram groups:

1. **Add bot to group:**
   - Open group settings
   - Add members → Search for your bot
   - Add the bot

2. **Configure privacy (via BotFather):**
   ```
   /setprivacy @my_nanobot_assistant_bot
   # Choose: Disable
   ```
   This allows the bot to read all messages.

3. **Restrict access:**
   ```json
   {
     "channels": {
       "telegram": {
         "allowFrom": ["-1001234567890"]
       }
     }
   }
   ```
   Note: Group IDs start with `-100`

4. **Use the bot:**
   - Mention: `@my_nanobot_assistant_bot Hello!`
   - Reply: Reply to bot's message
   - Command: `/help`

### Inline Queries

Enable inline mode to use the bot anywhere in Telegram:

1. **Enable via BotFather:**
   ```
   /setinline @my_nanobot_assistant_bot
   ```

2. **Use in any chat:**
   ```
   @my_nanobot_assistant_bot What is 2+2?
   ```

3. **Select result** from the dropdown

**Note**: This feature requires additional implementation in the Telegram channel handler.

### Webhook vs Polling

By default, nanobot uses **polling** (checks for new messages every few seconds).

For production, consider using **webhooks**:

**Benefits:**
- Real-time message delivery
- Lower latency
- Reduced server load

**Requirements:**
- Public HTTPS endpoint
- SSL certificate
- Domain name

**Setup** (future enhancement):
```python
# In telegram channel handler
bot.set_webhook(
    url="https://your-domain.com/telegram/webhook",
    certificate=open('cert.pem', 'rb')
)
```

## Monitoring and Logs

### Check Gateway Status

```bash
# View real-time logs
nanobot gateway --port 18790

# Look for:
# - "Telegram bot started"
# - Message received logs
# - LLM response logs
```

### Enable Verbose Logging

```bash
nanobot gateway --port 18790 --verbose
```

### Check Bot Info

Get bot information:
```bash
# Using Telegram API
curl https://api.telegram.org/bot<TOKEN>/getMe

# Or send /getMe to @BotFather's Bot API
```

### Monitor Message Count

Track how many messages your bot processes:

```bash
# Count messages in logs
grep "Telegram message" gateway.log | wc -l
```

## Troubleshooting

### Issue: Bot Not Responding

**Symptoms:** Bot is online but doesn't respond to messages

**Checklist:**
1. ✅ Gateway is running
2. ✅ Telegram channel is enabled in config
3. ✅ Bot token is correct
4. ✅ Your user ID is in `allowFrom` (if restricted)
5. ✅ Azure OpenAI is configured correctly

**Debug:**
```bash
# Check gateway output for errors
nanobot gateway --port 18790 2>&1 | tee gateway.log

# Look for:
# - "Telegram message received from <user_id>"
# - "Processing message"
# - "Error calling LLM"
```

**Common causes:**
- Incorrect token → Bot won't start
- User not allowed → Bot receives but ignores message
- LLM error → Bot receives but can't generate response

### Issue: "Unauthorized" Error

**Symptoms:**
```
Error: 401 Unauthorized - Invalid bot token
```

**Solution:**
1. Verify token in config matches BotFather's token
2. Check for extra spaces or newlines in token
3. Regenerate token with BotFather:
   ```
   /token @my_nanobot_assistant_bot
   ```
4. Update config and restart gateway

### Issue: "Can't Find Bot" in Telegram

**Symptoms:** Bot username doesn't appear in search

**Causes:**
- Bot username is incorrect (must end in `bot`)
- Bot was deleted by BotFather
- Telegram search is cached

**Solutions:**
1. Verify username with BotFather:
   ```
   /mybots
   # Select your bot
   # Check username
   ```

2. Use direct link:
   ```
   https://t.me/my_nanobot_assistant_bot
   ```

3. Clear Telegram cache (Settings → Data and Storage → Clear Cache)

### Issue: Bot Stops Working After Some Time

**Symptoms:** Bot works initially but stops after hours/days

**Possible causes:**

1. **Gateway crashed:**
   ```bash
   # Check if gateway is still running
   ps aux | grep nanobot

   # Check logs for crash reason
   tail -100 gateway.log
   ```

2. **Azure token expired:**
   ```bash
   # Refresh Azure credentials
   az login

   # Or regenerate token
   export AZURE_CLIENT_ID="your-client-id"
   ```

3. **Network issues:**
   ```bash
   # Test Telegram API connectivity
   curl https://api.telegram.org/bot<TOKEN>/getMe
   ```

**Solutions:**
- Use systemd/supervisor for auto-restart
- Implement health checks
- Monitor logs regularly

### Issue: "Flood Wait" Error

**Symptoms:**
```
Error: 429 Too Many Requests - Flood wait of X seconds
```

**Cause:** Telegram rate limiting (too many messages sent)

**Limits:**
- 30 messages per second to different users
- 1 message per second to the same user
- 20 messages per minute to the same group

**Solution:**
- Implement rate limiting in code
- Add delay between messages
- Reduce message frequency

### Issue: Access Denied Despite Correct User ID

**Symptoms:** Your user ID is in `allowFrom` but bot still doesn't respond

**Debug:**
```bash
# Check what user ID the bot sees
# Look in gateway logs for:
"Telegram message received from <user_id>"
```

**Compare with your actual user ID:**
```bash
# Message @userinfobot to confirm your ID
```

**Common issues:**
- User ID is string not number (or vice versa)
- Extra spaces in `allowFrom` array
- Case-sensitive username mismatch

**Solution:**
```json
{
  "channels": {
    "telegram": {
      "allowFrom": ["123456789"]  // Use quotes for IDs
      // OR
      "allowFrom": ["@username"]   // Use @ prefix for usernames
    }
  }
}
```

## Security Best Practices

### 1. Keep Token Secret

**Never share or commit your bot token:**

```bash
# Bad - token in config file committed to git
git add config.json

# Good - use environment variable
export TELEGRAM_BOT_TOKEN="123456789:ABC..."

# Or use .env file (and add to .gitignore)
echo "TELEGRAM_BOT_TOKEN=..." > ~/.nanobot/.env
echo ".env" >> .gitignore
```

### 2. Restrict Access

**Always use `allowFrom`:**

```json
{
  "channels": {
    "telegram": {
      "allowFrom": ["YOUR_USER_ID"]  // Only you can use the bot
    }
  }
}
```

**Without this, anyone can:**
- Access your AI assistant
- Use your Azure OpenAI quota
- Execute commands (if enabled)
- Access your workspace files

### 3. Revoke Token if Compromised

If your token is leaked:

1. **Revoke via BotFather:**
   ```
   /mybots
   # Select your bot
   # Bot Settings → Revoke Token
   ```

2. **Generate new token:**
   ```
   /token @my_nanobot_assistant_bot
   ```

3. **Update config** with new token

4. **Restart gateway**

### 4. Disable Unnecessary Features

If you don't need group chat:

```
/setprivacy @my_nanobot_assistant_bot
# Choose: Enable
```

If you don't need inline queries:

```
/setinline @my_nanobot_assistant_bot
# Disable inline mode
```

### 5. Monitor Usage

Track who's using your bot:

```bash
# Check gateway logs
grep "Telegram message" gateway.log | grep -o "from [0-9]*" | sort | uniq -c

# Example output:
#   15 from 123456789
#    3 from 987654321
```

### 6. Implement Rate Limiting

Prevent abuse by limiting messages per user:

```python
# Future enhancement in telegram channel handler
from collections import defaultdict
from time import time

user_messages = defaultdict(list)
MAX_MESSAGES = 10  # per minute

def check_rate_limit(user_id):
    now = time()
    user_messages[user_id] = [t for t in user_messages[user_id] if now - t < 60]
    if len(user_messages[user_id]) >= MAX_MESSAGES:
        return False
    user_messages[user_id].append(now)
    return True
```

### 7. Secure Server

If running on a server:

```bash
# Use firewall
sudo ufw enable
sudo ufw allow 18790/tcp  # Only if needed externally

# Don't expose gateway publicly
# Keep it on localhost:18790

# Use SSH key authentication
# Disable password SSH login
```

## Testing Guide

### Test 1: Basic Connectivity

```
Test: Send /start to bot
Expected: Welcome message
Success: ✅ Bot responds
```

### Test 2: Simple Query

```
Test: Ask "What is 2+2?"
Expected: "2 + 2 = 4" or similar
Success: ✅ Correct mathematical response
```

### Test 3: Code Generation

```
Test: "Write a Python hello world"
Expected: Python code snippet
Success: ✅ Valid Python code returned
```

### Test 4: Tool Usage

```
Test: "List files in workspace"
Expected: File listing from workspace
Success: ✅ Tool called and results shown
```

### Test 5: Context Retention

```
Test:
  1. "My name is John"
  2. "What's my name?"
Expected: "Your name is John"
Success: ✅ Context maintained across messages
```

### Test 6: Access Control

```
Test: Message from unauthorized user
Expected: No response or "Access denied"
Success: ✅ Unauthorized users blocked
```

### Test 7: Long Message

```
Test: Send very long message (>4000 chars)
Expected: Chunked response or truncation
Success: ✅ Handles long messages gracefully
```

### Test 8: Concurrent Users

```
Test: Multiple users message at once
Expected: All receive responses
Success: ✅ Handles concurrent requests
```

## Comparison: Telegram vs WhatsApp

| Feature | Telegram | WhatsApp |
|---------|----------|----------|
| **Setup Complexity** | Easy (just token) | Medium (needs bridge) |
| **Real-time** | Yes | Yes |
| **Group Support** | Native | Via bridge |
| **Inline Queries** | Yes | No |
| **File Sharing** | Up to 2GB | Limited |
| **Message Editing** | Yes | No |
| **Self-hosting** | No bridge needed | Needs bridge |
| **API Access** | Official Bot API | Unofficial (Baileys) |
| **Rate Limits** | Strict | More lenient |
| **Multi-device** | Native | Via WhatsApp Web |

## Frequently Asked Questions

### Q: Do I need a phone number for the bot?

**A:** No! Telegram bots don't need a phone number. You create them entirely through BotFather.

### Q: Can I have multiple bots?

**A:** Yes! Create as many bots as you want with BotFather. Each needs its own token and config.

### Q: Will the bot work if my computer is off?

**A:** No. The gateway must be running. Use a VPS or always-on computer for 24/7 availability.

### Q: Can I use the same bot token on multiple machines?

**A:** Technically yes, but not recommended. Telegram will send updates to only one instance.

### Q: How do I delete a bot?

**A:** Message BotFather:
```
/mybots
# Select your bot
# Bot Settings → Delete Bot
```

### Q: Can I change the bot's username?

**A:** No, bot usernames are permanent. You'd need to create a new bot.

### Q: Does this cost money?

**A:**
- Telegram Bot API: Free
- nanobot: Free (open source)
- Azure OpenAI: Pay per token usage
- VPS (if used): ~$5-20/month

### Q: Can I use this for commercial purposes?

**A:** Check Telegram's Terms of Service and your LLM provider's terms. Personal/authorized use is generally fine.

### Q: How do I get notified of new messages?

**A:** The bot automatically processes incoming messages. For outbound notifications, use the cron feature.

### Q: Can the bot send images/files?

**A:** Yes! This requires implementation in the Telegram channel handler:
```python
bot.send_photo(chat_id, photo=open('image.jpg', 'rb'))
bot.send_document(chat_id, document=open('file.pdf', 'rb'))
```

## Advanced Configuration

### Custom Commands

Implement custom `/` commands:

```python
# In telegram channel handler
@bot.message_handler(commands=['weather'])
def weather_command(message):
    # Get weather info
    response = "Current weather: Sunny, 72°F"
    bot.reply_to(message, response)
```

### Keyboard Buttons

Add interactive buttons:

```python
from telegram import ReplyKeyboardMarkup

keyboard = [
    ['Help', 'Status'],
    ['Settings', 'About']
]
reply_markup = ReplyKeyboardMarkup(keyboard)
bot.send_message(chat_id, "Choose an option:", reply_markup=reply_markup)
```

### Inline Keyboard

Add clickable inline buttons:

```python
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

keyboard = [
    [InlineKeyboardButton("Option 1", callback_data='opt1')],
    [InlineKeyboardButton("Option 2", callback_data='opt2')]
]
reply_markup = InlineKeyboardMarkup(keyboard)
bot.send_message(chat_id, "Pick one:", reply_markup=reply_markup)
```

## Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [BotFather Guide](https://core.telegram.org/bots#botfather)
- [nanobot Documentation](README.md)
- [Azure OpenAI Guide](AZURE_OPENAI_GUIDE.md)
- [Python Telegram Bot Library](https://python-telegram-bot.org/)

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review gateway logs for errors
3. Test with CLI first: `nanobot agent -m "test"`
4. Verify bot token with BotFather
5. Check Telegram Bot API status
6. Open an issue on GitHub

---

**Last Updated:** 2026-02-04
**API Version:** Telegram Bot API 7.0+
**Status:** Production Ready ✅
