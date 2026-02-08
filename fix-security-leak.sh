#!/bin/bash

# Quick fix script for exposed secrets
# Run this AFTER revoking the secrets!

set -e

echo "🔒 Security Leak Fix Script"
echo "==========================="
echo ""
echo "⚠️  IMPORTANT: Have you revoked the exposed secrets?"
echo "    1. OpenRouter API key at https://openrouter.ai/"
echo "    2. Telegram bot token via @BotFather"
echo ""
read -p "Have you revoked the secrets? (yes/no): " REVOKED

if [ "$REVOKED" != "yes" ]; then
    echo ""
    echo "❌ Please revoke the secrets first!"
    echo ""
    echo "OpenRouter: https://openrouter.ai/ → Settings → API Keys → Revoke"
    echo "Telegram: @BotFather → /mybots → @mynanoagentbot → API Token → Revoke"
    echo ""
    exit 1
fi

echo ""
echo "✓ Proceeding with fix..."
echo ""

# Backup files first
echo "📦 Creating backups..."
cp config.azure.example.json config.azure.example.json.backup
cp md/TELEGRAM_GUIDE.md md/TELEGRAM_GUIDE.md.backup
echo "   ✓ Backups created (.backup files)"

# Fix config.azure.example.json
echo ""
echo "🔧 Fixing config.azure.example.json..."
sed -i '' 's/"apiKey": "sk-or-v1-[a-f0-9]*"/"apiKey": "YOUR_OPENROUTER_API_KEY_HERE"/' config.azure.example.json
echo "   ✓ Replaced OpenRouter API key with placeholder"

# Fix md/TELEGRAM_GUIDE.md
echo ""
echo "🔧 Fixing md/TELEGRAM_GUIDE.md..."
sed -i '' 's/8201530157:AAGGTo9lCRwYK26gJf_cLCgODsazSnyGPGk/YOUR_BOT_TOKEN_HERE/g' md/TELEGRAM_GUIDE.md
echo "   ✓ Replaced Telegram token with placeholder"

# Show diff
echo ""
echo "📋 Changes made:"
echo ""
echo "--- config.azure.example.json ---"
git diff config.azure.example.json | head -20
echo ""
echo "--- md/TELEGRAM_GUIDE.md ---"
git diff md/TELEGRAM_GUIDE.md | head -20

# Commit changes
echo ""
read -p "Commit these changes? (yes/no): " COMMIT

if [ "$COMMIT" = "yes" ]; then
    git add config.azure.example.json md/TELEGRAM_GUIDE.md
    git commit -m "security: remove exposed secrets from example files

- Replace OpenRouter API key with placeholder
- Replace Telegram bot token with placeholder
- Old secrets have been revoked
- Fixes security leak identified on 2026-02-08"

    echo ""
    echo "✓ Changes committed"
    echo ""
    echo "📤 Next steps:"
    echo "   1. Push changes: git push origin merge"
    echo "   2. Consider cleaning git history (see SECURITY_INCIDENT.md)"
    echo "   3. Verify secrets are revoked"
    echo "   4. Update ~/.nanobot/config.json with NEW secrets"
else
    echo ""
    echo "⚠️  Changes not committed. Review manually with: git diff"
fi

echo ""
echo "✅ Fix script complete!"
echo ""
echo "📖 See SECURITY_INCIDENT.md for full incident report and next steps"
