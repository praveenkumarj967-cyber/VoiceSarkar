"""
Telephony provider abstraction — Twilio and Exotel implementations.
"""
from __future__ import annotations
import logging
from abc import ABC, abstractmethod
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

LANG_VOICE_MAP = {
    "en-IN": ("en-IN", "Polly.Aditi"),
    "hi-IN": ("hi-IN", "Polly.Aditi"),
    "te-IN": ("te-IN", "Polly.Aditi"),
    "ta-IN": ("ta-IN", "Polly.Aditi"),
    "mr-IN": ("mr-IN", "Polly.Aditi"),
    "bn-IN": ("bn-IN", "Polly.Aditi"),
    "kn-IN": ("kn-IN", "Polly.Aditi"),
    "gu-IN": ("gu-IN", "Polly.Aditi"),
    "or-IN": ("or-IN", "Polly.Aditi"),
    "pa-IN": ("pa-IN", "Polly.Aditi"),
    "ml-IN": ("ml-IN", "Polly.Aditi"),
}


class TelephonyProvider(ABC):
    @abstractmethod
    def build_gather_response(self, say_text: str, gather_action: str, language: str = "en-IN", timeout: int = 5) -> str:
        pass

    @abstractmethod
    def build_say_hangup(self, text: str, language: str = "en-IN") -> str:
        pass

    @abstractmethod
    def send_sms(self, to_number: str, body: str) -> str:
        pass

    @abstractmethod
    def build_record_response(self, prompt: str, record_action: str, language: str = "en-IN") -> str:
        pass


class TwilioProvider(TelephonyProvider):
    """Twilio telephony implementation."""

    def __init__(self):
        from twilio.rest import Client
        self.client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        self.from_number = settings.twilio_from_number

    def build_gather_response(self, say_text: str, gather_action: str, language: str = "en-IN", timeout: int = 5) -> str:
        from twilio.twiml.voice_response import VoiceResponse, Gather
        twilio_lang, voice = LANG_VOICE_MAP.get(language, ("en-IN", "Polly.Aditi"))
        vr = VoiceResponse()
        gather = Gather(
            input="speech",
            action=gather_action,
            method="POST",
            language=twilio_lang,
            speech_timeout="auto",
            timeout=timeout,
            action_on_empty_result=True,
        )
        gather.say(say_text, voice=voice, language=twilio_lang)
        vr.append(gather)
        vr.say("I didn't hear a response. Please call back if you need assistance.", voice=voice, language=twilio_lang)
        vr.hangup()
        return str(vr)

    def build_say_hangup(self, text: str, language: str = "en-IN") -> str:
        from twilio.twiml.voice_response import VoiceResponse
        twilio_lang, voice = LANG_VOICE_MAP.get(language, ("en-IN", "Polly.Aditi"))
        vr = VoiceResponse()
        vr.say(text, voice=voice, language=twilio_lang)
        vr.hangup()
        return str(vr)

    def build_record_response(self, prompt: str, record_action: str, language: str = "en-IN") -> str:
        from twilio.twiml.voice_response import VoiceResponse
        twilio_lang, voice = LANG_VOICE_MAP.get(language, ("en-IN", "Polly.Aditi"))
        vr = VoiceResponse()
        vr.say(prompt, voice=voice, language=twilio_lang)
        vr.record(action=record_action, method="POST", max_length=30, play_beep=True, trim="trim-silence")
        return str(vr)

    def send_sms(self, to_number: str, body: str) -> str:
        msg = self.client.messages.create(to=to_number, from_=self.from_number, body=body)
        return msg.sid


class ExotelProvider(TelephonyProvider):
    """
    Exotel telephony implementation.
    Uses Exotel ExoML (similar to TwiML) via REST API.
    Requires: EXOTEL_SID, EXOTEL_TOKEN, EXOTEL_FROM
    """

    def __init__(self):
        import httpx
        self.sid = settings.exotel_sid
        self.token = settings.exotel_token
        self.from_number = settings.exotel_from
        self.base_url = f"https://api.exotel.com/v1/Accounts/{self.sid}"

    def build_gather_response(self, say_text: str, gather_action: str, language: str = "en-IN", timeout: int = 5) -> str:
        # Exotel ExoML response
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="{gather_action}" method="POST" timeout="{timeout}" input="speech" language="{language}">
    <Say>{say_text}</Say>
  </Gather>
  <Say>We did not receive any input. Goodbye.</Say>
  <Hangup/>
</Response>"""

    def build_say_hangup(self, text: str, language: str = "en-IN") -> str:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="{language}">{text}</Say>
  <Hangup/>
</Response>"""

    def build_record_response(self, prompt: str, record_action: str, language: str = "en-IN") -> str:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="{language}">{prompt}</Say>
  <Record action="{record_action}" method="POST" maxLength="30" playBeep="true"/>
</Response>"""

    def send_sms(self, to_number: str, body: str) -> str:
        import httpx
        resp = httpx.post(
            f"{self.base_url}/Sms/send.json",
            auth=(self.sid, self.token),
            data={"From": self.from_number, "To": to_number, "Body": body},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("SMSMessage", {}).get("Sid", "unknown")


class MockTelephonyProvider(TelephonyProvider):
    """No-op provider for local development without real telephony credentials."""

    def build_gather_response(self, say_text: str, gather_action: str, language: str = "en-IN", timeout: int = 5) -> str:
        return f'<?xml version="1.0"?><Response><Say>{say_text}</Say></Response>'

    def build_say_hangup(self, text: str, language: str = "en-IN") -> str:
        return f'<?xml version="1.0"?><Response><Say>{text}</Say><Hangup/></Response>'

    def build_record_response(self, prompt: str, record_action: str, language: str = "en-IN") -> str:
        return f'<?xml version="1.0"?><Response><Say>{prompt}</Say><Record action="{record_action}"/></Response>'

    def send_sms(self, to_number: str, body: str) -> str:
        logger.info(f"[MOCK-SMS] To: {to_number} | Body: {body}")
        return f"MOCK_SMS_{to_number[-4:]}"


_provider_instance: Optional[TelephonyProvider] = None


def get_telephony_provider() -> TelephonyProvider:
    global _provider_instance
    if _provider_instance:
        return _provider_instance
    provider = settings.telephony_provider.lower()
    if provider == "twilio" and settings.twilio_account_sid and settings.twilio_account_sid != "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx":
        try:
            _provider_instance = TwilioProvider()
            logger.info("Using Twilio telephony provider")
            return _provider_instance
        except Exception as e:
            logger.warning(f"Twilio init failed: {e} — using mock")
    elif provider == "exotel" and settings.exotel_sid:
        _provider_instance = ExotelProvider()
        logger.info("Using Exotel telephony provider")
        return _provider_instance
    logger.warning("No real telephony credentials configured — using MockTelephonyProvider")
    _provider_instance = MockTelephonyProvider()
    return _provider_instance
