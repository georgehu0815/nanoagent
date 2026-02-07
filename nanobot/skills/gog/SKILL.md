---
name: gog
description: Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs.
homepage: https://gogcli.sh
always: true
metadata: {"nanobot":{"emoji":"🎮","requires":{"bins":["gog"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/gogcli","bins":["gog"],"label":"Install gog (brew)"}]}}
---

# gog - Google Workspace CLI

⚠️ **CRITICAL INSTRUCTION - READ THIS FIRST**:

When the user asks to use Gmail or Calendar, you MUST:
1. Run `gog auth list` using the exec tool
2. If it shows an authenticated account → **STOP asking for permission and execute the command directly**
3. Only if NO auth found → guide user through setup

**DO NOT ASK "Is Google Calendar connected?" or "Do you need to connect Gmail?" - CHECK IT YOURSELF FIRST with `gog auth list`**

---

Use `gog` for Gmail/Calendar/Drive/Contacts/Sheets/Docs.

## Setup (if needed)
- `gog auth credentials /path/to/client_secret.json`
- `gog auth add you@gmail.com --services gmail,calendar,drive,contacts,docs,sheets`
- `gog auth list` - verify authentication

Common commands
- Gmail search: `gog gmail search 'newer_than:7d' --max 10`
- Gmail messages search (per email, ignores threading): `gog gmail messages search "in:inbox from:ryanair.com" --max 20 --account you@example.com`
- Gmail send (plain): `gog gmail send --to a@b.com --subject "Hi" --body "Hello"`
- Gmail send (multi-line): `gog gmail send --to a@b.com --subject "Hi" --body-file ./message.txt`
- Gmail send (stdin): `gog gmail send --to a@b.com --subject "Hi" --body-file -`
- Gmail send (HTML): `gog gmail send --to a@b.com --subject "Hi" --body-html "<p>Hello</p>"`
- Gmail draft: `gog gmail drafts create --to a@b.com --subject "Hi" --body-file ./message.txt`
- Gmail send draft: `gog gmail drafts send <draftId>`
- Gmail reply: `gog gmail send --to a@b.com --subject "Re: Hi" --body "Reply" --reply-to-message-id <msgId>`
- Calendar list events: `gog calendar events <calendarId> --from <iso> --to <iso>`
- Calendar create event: `gog calendar create <calendarId> --summary "Title" --from <iso> --to <iso>`
- Calendar create with color: `gog calendar create <calendarId> --summary "Title" --from <iso> --to <iso> --event-color 7`
- Calendar update event: `gog calendar update <calendarId> <eventId> --summary "New Title" --event-color 4`
- Calendar delete event: `gog calendar delete <calendarId> <eventId> --force` (--force required in non-interactive mode)
- Calendar show colors: `gog calendar colors`
- Drive search: `gog drive search "query" --max 10`
- Contacts: `gog contacts list --max 20`
- Sheets get: `gog sheets get <sheetId> "Tab!A1:D10" --json`
- Sheets update: `gog sheets update <sheetId> "Tab!A1:B2" --values-json '[["A","B"],["1","2"]]' --input USER_ENTERED`
- Sheets append: `gog sheets append <sheetId> "Tab!A:C" --values-json '[["x","y","z"]]' --insert INSERT_ROWS`
- Sheets clear: `gog sheets clear <sheetId> "Tab!A2:Z"`
- Sheets metadata: `gog sheets metadata <sheetId> --json`
- Docs export: `gog docs export <docId> --format txt --out /tmp/doc.txt`
- Docs cat: `gog docs cat <docId>`

Calendar Time Format
- **CRITICAL**: Calendar times MUST use RFC3339 format with timezone: `YYYY-MM-DDTHH:MM:SS±HH:MM`
- **NO --timezone flag exists** - timezone is part of the timestamp itself
- User's timezone: Use system timezone (check with `date +%z`) or default to Eastern Time (`-05:00` winter, `-04:00` summer)
- **Default duration**: If user doesn't specify end time (`--to`), add 30 minutes to start time

Time Conversion Rules
1. Parse user's natural language time (e.g., "9 PM", "9:00PM", "21:00", "dinner time")
2. Convert to 24-hour format (9 PM → 21:00)
3. Get today's date in YYYY-MM-DD format
4. Combine with timezone: `2026-02-06T21:00:00-05:00`
5. If no end time specified: add 30 minutes to start time

Timezone Reference
- Eastern (ET): `-05:00` (winter) or `-04:00` (summer/DST)
- Central (CT): `-06:00` (winter) or `-05:00` (summer/DST)
- Mountain (MT): `-07:00` (winter) or `-06:00` (summer/DST)
- Pacific (PT): `-08:00` (winter) or `-07:00` (summer/DST)
- UTC: `Z`

Calendar Examples
```bash
# User says: "dinner at 9 PM today"
# Convert to:
gog calendar create primary \
  --summary "Dinner" \
  --from "2026-02-06T21:00:00-05:00" \
  --to "2026-02-06T21:30:00-05:00"

# User says: "meeting tomorrow 2-3 PM"
# Convert to:
gog calendar create primary \
  --summary "Meeting" \
  --from "2026-02-07T14:00:00-05:00" \
  --to "2026-02-07T15:00:00-05:00"

# User says: "lunch at noon" (no end time)
# Convert to (default: +30 minutes):
gog calendar create primary \
  --summary "Lunch" \
  --from "2026-02-06T12:00:00-05:00" \
  --to "2026-02-06T12:30:00-05:00"
```

Calendar Colors
- Use `gog calendar colors` to see all available event colors (IDs 1-11)
- Add colors to events with `--event-color <id>` flag
- Event color IDs (from `gog calendar colors` output):
  - 1: #a4bdfc
  - 2: #7ae7bf
  - 3: #dbadff
  - 4: #ff887c
  - 5: #fbd75b
  - 6: #ffb878
  - 7: #46d6db
  - 8: #e1e1e1
  - 9: #5484ed
  - 10: #51b749
  - 11: #dc2127

Email Formatting
- Prefer plain text. Use `--body-file` for multi-paragraph messages (or `--body-file -` for stdin).
- Same `--body-file` pattern works for drafts and replies.
- `--body` does not unescape `\n`. If you need inline newlines, use a heredoc or `$'Line 1\n\nLine 2'`.
- Use `--body-html` only when you need rich formatting.
- HTML tags: `<p>` for paragraphs, `<br>` for line breaks, `<strong>` for bold, `<em>` for italic, `<a href="url">` for links, `<ul>`/`<li>` for lists.
- Example (plain text via stdin):
  ```bash
  gog gmail send --to recipient@example.com \
    --subject "Meeting Follow-up" \
    --body-file - <<'EOF'
  Hi Name,

  Thanks for meeting today. Next steps:
  - Item one
  - Item two

  Best regards,
  Your Name
  EOF
  ```
- Example (HTML list):
  ```bash
  gog gmail send --to recipient@example.com \
    --subject "Meeting Follow-up" \
    --body-html "<p>Hi Name,</p><p>Thanks for meeting today. Here are the next steps:</p><ul><li>Item one</li><li>Item two</li></ul><p>Best regards,<br>Your Name</p>"
  ```

Notes
- Set `GOG_ACCOUNT=you@gmail.com` to avoid repeating `--account`.
- For scripting, prefer `--json` plus `--no-input`.
- Sheets values can be passed via `--values-json` (recommended) or as inline rows.
- Docs supports export/cat/copy. In-place edits require a Docs API client (not in gog).
- Confirm before sending mail or creating events.
- `gog gmail search` returns one row per thread; use `gog gmail messages search` when you need every individual email returned separately.
- **Calendar times**: Always include timezone in RFC3339 format. No separate --timezone flag exists.
- **Calendar duration**: If user doesn't specify end time, automatically add 30 minutes to start time.
- **Calendar delete**: Always use `--force` flag when deleting events (required in non-interactive/automation mode).
- **Current date**: Today is 2026-02-06. Use this for "today", calculate dates for "tomorrow", "next week", etc.
