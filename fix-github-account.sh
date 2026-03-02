#!/usr/bin/env bash
# fix-github-account.sh
# Fix GitHub push being rejected because the wrong account (e.g. a work SSO
# account) is cached in GCM. Pins a personal GitHub username and clears the
# stale credential so GCM re-authenticates on next push.
#
# Usage:
#   ./fix-github-account.sh                        # uses default: georgehu0815
#   ./fix-github-account.sh <github-username>       # explicit username

set -euo pipefail

GITHUB_USER="${1:-georgehu0815}"

echo ">>> Pinning GitHub username to: $GITHUB_USER"
git config --global credential.https://github.com.username "$GITHUB_USER"

echo ">>> Clearing cached GitHub credential from GCM..."
printf "protocol=https\nhost=github.com\n" | git credential reject 2>/dev/null || true

echo ">>> Done. Next push will re-authenticate as $GITHUB_USER."
echo "    Run:  git push --set-upstream origin \$(git branch --show-current)"
