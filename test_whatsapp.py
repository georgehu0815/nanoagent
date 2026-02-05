#!/usr/bin/env python3
"""
Test script to monitor WhatsApp messages and show sender information.
Run this to see who's messaging you on WhatsApp.
"""

import asyncio
import json
import websockets
from datetime import datetime

async def monitor_whatsapp():
    """Monitor WhatsApp bridge for incoming messages."""
    bridge_url = "ws://localhost:3001"

    print("🔍 Monitoring WhatsApp messages...")
    print("📱 Send a message from WhatsApp to see sender info\n")
    print("Press Ctrl+C to stop\n")
    print("-" * 60)

    try:
        async with websockets.connect(bridge_url) as ws:
            async for message in ws:
                try:
                    data = json.loads(message)
                    msg_type = data.get("type")

                    if msg_type == "message":
                        sender = data.get("sender", "")
                        content = data.get("content", "")
                        timestamp = data.get("timestamp", 0)
                        is_group = data.get("isGroup", False)

                        # Extract phone number
                        phone = sender.split("@")[0] if "@" in sender else sender

                        # Format timestamp
                        dt = datetime.fromtimestamp(timestamp)
                        time_str = dt.strftime("%H:%M:%S")

                        print(f"\n📩 New Message at {time_str}")
                        print(f"   From: {sender}")
                        print(f"   Phone: {phone}")
                        print(f"   Type: {'Group' if is_group else 'Direct'}")
                        print(f"   Content: {content[:100]}...")
                        print("-" * 60)

                    elif msg_type == "status":
                        status = data.get("status")
                        print(f"📡 Status: {status}")

                    elif msg_type == "qr":
                        print("📱 QR code available for scanning")

                except json.JSONDecodeError:
                    pass
                except Exception as e:
                    print(f"⚠️  Error: {e}")

    except KeyboardInterrupt:
        print("\n\n✅ Monitoring stopped")
    except Exception as e:
        print(f"\n❌ Connection error: {e}")
        print("Make sure the bridge is running: nanobot gateway")

if __name__ == "__main__":
    asyncio.run(monitor_whatsapp())
