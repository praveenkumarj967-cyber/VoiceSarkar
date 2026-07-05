from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather

from app.config import settings

LANG_TO_TWILIO_VOICE = {
    "en-IN": ("en-IN", "Polly.Aditi"),
    "hi-IN": ("hi-IN", "Polly.Aditi"),
    "te-IN": ("te-IN", "Polly.Aditi"),   # Twilio speech synthesis coverage for
    "ta-IN": ("ta-IN", "Polly.Aditi"),   # regional languages varies — verify
    "mr-IN": ("mr-IN", "Polly.Aditi"),   # against current Twilio voice list and
    "bn-IN": ("bn-IN", "Polly.Aditi"),   # fall back to Bhashini TTS audio <Play> if unsupported
}

_twilio_client = None


def get_twilio_client() -> Client:
    global _twilio_client
    if _twilio_client is None:
        _twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _twilio_client


def build_gather_response(say_text: str, gather_action: str, language: str = "en-IN") -> str:
    """
    Builds TwiML that speaks `say_text` then listens for the caller's next
    utterance via Twilio's built-in speech recognition, posting the result to
    `gather_action`. For languages Twilio can't transcribe well, swap the
    <Gather> for a <Record> + Bhashini ASR pass instead (see gather_via_bhashini_response).
    """
    twilio_lang, voice = LANG_TO_TWILIO_VOICE.get(language, ("en-IN", "Polly.Aditi"))
    vr = VoiceResponse()
    gather = Gather(
        input="speech",
        action=gather_action,
        method="POST",
        language=twilio_lang,
        speech_timeout="auto",
    )
    gather.say(say_text, voice=voice, language=twilio_lang)
    vr.append(gather)
    # If the caller says nothing, Twilio falls through here — retry once.
    vr.redirect(gather_action.replace("/gather", "/incoming"))
    return str(vr)


def build_record_response(prompt_text: str, record_action: str, language: str = "en-IN") -> str:
    """
    Alternative flow for languages/scripts where Bhashini ASR should be used
    instead of Twilio's built-in speech recognition: play the prompt, then
    <Record> raw audio and POST it to `record_action`, where you fetch the
    recording and run it through BhashiniClient.speech_to_text().
    """
    twilio_lang, voice = LANG_TO_TWILIO_VOICE.get(language, ("en-IN", "Polly.Aditi"))
    vr = VoiceResponse()
    vr.say(prompt_text, voice=voice, language=twilio_lang)
    vr.record(action=record_action, method="POST", max_length=20,
               play_beep=True, trim="trim-silence")
    return str(vr)


def build_say_and_hangup(text: str, language: str = "en-IN") -> str:
    twilio_lang, voice = LANG_TO_TWILIO_VOICE.get(language, ("en-IN", "Polly.Aditi"))
    vr = VoiceResponse()
    vr.say(text, voice=voice, language=twilio_lang)
    vr.hangup()
    return str(vr)


def send_sms(to_number: str, body: str) -> str:
    client = get_twilio_client()
    msg = client.messages.create(to=to_number, from_=settings.twilio_from_number, body=body)
    return msg.sid
