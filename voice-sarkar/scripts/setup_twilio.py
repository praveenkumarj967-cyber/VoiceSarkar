import sys
import re
import os
from twilio.rest import Client

def update_env(sid, token, number, url):
    ENV_PATH = ".env"
    with open(ENV_PATH, "r") as f:
        content = f.read()

    replacements = {
        r"TWILIO_ACCOUNT_SID=.*": f"TWILIO_ACCOUNT_SID={sid}",
        r"TWILIO_AUTH_TOKEN=.*": f"TWILIO_AUTH_TOKEN={token}",
        r"TWILIO_FROM_NUMBER=.*": f"TWILIO_FROM_NUMBER={number}",
        r"PUBLIC_BASE_URL=.*": f"PUBLIC_BASE_URL={url}",
        r"TELEPHONY_PROVIDER=.*": "TELEPHONY_PROVIDER=twilio"
    }

    for pattern, repl in replacements.items():
        if re.search(pattern, content):
            content = re.sub(pattern, repl, content)
        else:
            content += f"\n{repl}"

    with open(ENV_PATH, "w") as f:
        f.write(content)
    print("[OK] .env file updated successfully.")

def configure_twilio_webhook(sid, token, number, url):
    client = Client(sid, token)
    incoming_numbers = client.incoming_phone_numbers.list(phone_number=number)
    
    if not incoming_numbers:
        incoming_numbers = client.incoming_phone_numbers.list(phone_number=number.replace("+", ""))
        
    if not incoming_numbers:
        print(f"[ERROR] Could not find active Twilio number {number} in your account.")
        return

    number_sid = incoming_numbers[0].sid
    webhook_url = f"{url}/api/v1/voice/incoming"
    
    client.incoming_phone_numbers(number_sid).update(
        voice_url=webhook_url,
        voice_method="POST"
    )
    print(f"[OK] Webhook voice_url successfully updated to: {webhook_url}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python setup_twilio.py <ACCOUNT_SID> <AUTH_TOKEN> <PHONE_NUMBER> <PUBLIC_URL>")
        sys.exit(1)
    
    sid, token, number, url = sys.argv[1:5]
    update_env(sid, token, number, url)
    configure_twilio_webhook(sid, token, number, url)
