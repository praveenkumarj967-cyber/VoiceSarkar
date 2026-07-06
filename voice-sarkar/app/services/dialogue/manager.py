"""
Stateful dialogue manager for Voice Sarkar.
Manages multi-turn voice conversations with citizens.

Session states:
  greeting -> language_select -> await_issue -> slot_filling -> confirm -> done
"""
from __future__ import annotations
import json
import logging
import uuid
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any

from app.services.ai.intent_engine import (
    INTENTS, detect_intent, is_escalation_request, is_cancel_request, is_skip
)

logger = logging.getLogger(__name__)

SESSION_TTL = 1200  # 20 minutes

LANGUAGE_OPTIONS = {
    "1": ("hi-IN", "Hindi"),
    "2": ("te-IN", "Telugu"),
    "3": ("ta-IN", "Tamil"),
    "4": ("bn-IN", "Bengali"),
    "5": ("mr-IN", "Marathi"),
    "6": ("kn-IN", "Kannada"),
    "7": ("gu-IN", "Gujarati"),
    "8": ("or-IN", "Odia"),
    "9": ("pa-IN", "Punjabi"),
    "10": ("ml-IN", "Malayalam"),
    "0": ("en-IN", "English"),
}

LANGUAGE_KEYWORDS = {
    "hindi": "hi-IN", "हिंदी": "hi-IN",
    "telugu": "te-IN", "తెలుగు": "te-IN",
    "tamil": "ta-IN", "தமிழ்": "ta-IN",
    "bengali": "bn-IN", "বাংলা": "bn-IN",
    "marathi": "mr-IN", "मराठी": "mr-IN",
    "kannada": "kn-IN", "ಕನ್ನಡ": "kn-IN",
    "gujarati": "gu-IN", "ગુજરાતી": "gu-IN",
    "odia": "or-IN", "ଓଡ଼ିଆ": "or-IN",
    "punjabi": "pa-IN", "ਪੰਜਾਬੀ": "pa-IN",
    "malayalam": "ml-IN", "മലയാളം": "ml-IN",
    "english": "en-IN",
}

GREETINGS = {
    "en-IN": "Namaste! Welcome to Voice Sarkar. I am here to help you access government services. Please tell me — what issue are you facing today?",
    "hi-IN": "नमस्ते! वॉइस सरकार में आपका स्वागत है। मैं आपकी सरकारी सेवाओं में मदद करने के लिए यहाँ हूँ। कृपया बताइए — आज आपकी क्या समस्या है?",
    "te-IN": "నమస్కారం! వాయిస్ సర్కార్‌కు స్వాగతం. మీకు ఏ ప్రభుత్వ సేవ అవసరం?",
    "ta-IN": "வணக்கம்! வாய்ஸ் சர்கார்க்கு வரவேற்கிறோம். உங்களுக்கு என்ன அரசு சேவை தேவை?",
}

LANGUAGE_PROMPT = (
    "Before we begin, which language would you prefer? "
    "Say Hindi, Telugu, Tamil, Bengali, Marathi, Kannada, Gujarati, Odia, Punjabi, Malayalam, or English."
)


@dataclass
class DialogueSession:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    step: str = "greeting"          # greeting|language_select|await_issue|slot_filling|confirm|done|escalated
    language: str = "en-IN"
    intent: Optional[str] = None
    confidence: float = 0.0
    slots: Dict[str, Any] = field(default_factory=dict)
    slot_queue: List[str] = field(default_factory=list)
    turn_count: int = 0
    mobile: str = ""
    escalated: bool = False

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "DialogueSession":
        return cls(**d)


@dataclass
class DialogueResult:
    say: str
    action: str  # ask | confirm | submit | status | escalate | cancel | done
    session: DialogueSession
    intent: Optional[str] = None
    confidence: float = 0.0
    say_en: Optional[str] = None


# ── Session Store ─────────────────────────────────────────────────────────────

_memory_store: Dict[str, str] = {}


class SessionStore:
    """Tries Redis, falls back to in-memory."""

    def __init__(self):
        self._redis = None
        try:
            import redis as _redis
            from app.core.config import settings
            client = _redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2)
            client.ping()
            self._redis = client
        except Exception:
            pass

    def get(self, key: str) -> Optional[dict]:
        try:
            if self._redis:
                raw = self._redis.get(key)
                return json.loads(raw) if raw else None
        except Exception:
            pass
        raw = _memory_store.get(key)
        return json.loads(raw) if raw else None

    def set(self, key: str, data: dict):
        try:
            if self._redis:
                self._redis.set(key, json.dumps(data), ex=SESSION_TTL)
                return
        except Exception:
            pass
        _memory_store[key] = json.dumps(data)

    def delete(self, key: str):
        try:
            if self._redis:
                self._redis.delete(key)
                return
        except Exception:
            pass
        _memory_store.pop(key, None)


_store = SessionStore()


def _session_key(call_sid: str) -> str:
    return f"vs:dialogue:{call_sid}"


def load_session(call_sid: str) -> DialogueSession:
    data = _store.get(_session_key(call_sid))
    if data:
        return DialogueSession.from_dict(data)
    return DialogueSession(session_id=call_sid)


def save_session(call_sid: str, session: DialogueSession):
    _store.set(_session_key(call_sid), session.to_dict())


def clear_session(call_sid: str):
    _store.delete(_session_key(call_sid))


# ── Local Translation Dictionary for Demo / Fallback ─────────────────────────
LOCAL_TRANSLATIONS = {
    "hi-IN": {
        "Could you tell me your full name as registered for the pension?": "क्या आप पेंशन के लिए पंजीकृत अपना पूरा नाम बता सकते हैं?",
        "What type of pension? Old age, widow, or disability pension?": "किस प्रकार की पेंशन? वृद्धावस्था, विधवा, या विकलांगता पेंशन?",
        "How many months has the pension been pending?": "पेंशन कितने महीनों से लंबित है?",
        "What is your district and state?": "आपका जिला और राज्य कौन सा है?",
        "Should I submit this request? Please say YES to confirm or NO to make changes.": "क्या मुझे यह अनुरोध सबमिट करना चाहिए? पुष्टि करने के लिए हाँ कहें या बदलाव करने के लिए नहीं कहें।",
        "Let me confirm your request. This is a": "मुझे आपके अनुरोध की पुष्टि करने दें। यह एक",
        "Details:": "विवरण:",
        "Your complaint has been filed. Reference number is": "आपकी शिकायत दर्ज कर ली गई है। संदर्भ संख्या है",
        "Thank you!": "धन्यवाद!",
        "I didn't catch that. Please say YES to confirm or NO to redo.": "मुझे समझ नहीं आया। पुष्टि करने के लिए हाँ या फिर से करने के लिए नहीं कहें।",
        "What government issue can I help you with today?": "आज मैं आपकी किस सरकारी समस्या में मदद कर सकता हूँ?",
        "I see this is about Pension Grievance.": "मैं देख सकता हूँ कि यह पेंशन शिकायत के बारे में है।",
        "I see this is about Water Supply Complaint.": "मैं देख सकता हूँ कि यह जल आपूर्ति शिकायत के बारे में है।",
        "May I have your name?": "क्या मुझे आपका नाम मिल सकता है?",
        "What is your ward or house number?": "आपका वार्ड या घर का नंबर क्या है?",
        "Please describe the water problem you are facing.": "कृपया पानी की समस्या का वर्णन करें जिसका आप सामना कर रहे हैं।",
    },
    "te-IN": {
        "Could you tell me your full name as registered for the pension?": "పింఛను కోసం నమోదైన మీ పూర్తి పేరు చెప్పగలరా?",
        "What type of pension? Old age, widow, or disability pension?": "ఏ రకమైన పింఛను? వృద్ధాప్య, వితంతు లేదా వికలాంగుల పింఛనా?",
        "How many months has the pension been pending?": "పింఛను ఎన్ని నెలలుగా పెండింగ్‌లో ఉంది?",
        "What is your district and state?": "మీ జిల్లా మరియు రాష్ట్రం ఏమిటి?",
        "Should I submit this request? Please say YES to confirm or NO to make changes.": "నేను ఈ అభ్యర్థనను సమర్పించాలా? ధృవీకరించడానికి అవును అని లేదా మార్పులు చేయడానికి కాదు అని చెప్పండి.",
        "Let me confirm your request. This is a": "మీ అభ్యర్థనను ధృవీకరించనివ్వండి. ఇది ఒక",
        "Details:": "వివరాలు:",
        "Your complaint has been filed. Reference number is": "మీ ఫిర్యాదు నమోదు చేయబడింది. రిఫరెన్స్ సంఖ్య",
        "Thank you!": "ధన్యవాదాలు!",
        "I didn't catch that. Please say YES to confirm or NO to redo.": "నాకు అర్థం కాలేదు. ధృవీకరించడానికి అవును అని లేదా మళ్లీ చేయడానికి కాదు అని చెప్పండి.",
        "What government issue can I help you with today?": "ఈరోజు నేను మీకు ఏ ప్రభుత్వ సమస్యలో సహాయం చేయగలను?",
        "I see this is about Pension Grievance.": "ఇది పింఛను ఫిర్యాదుకు సంబంధించినదని నేను గ్రహించాను.",
        "I see this is about Water Supply Complaint.": "ఇది నీటి సరఫరా ఫిర్యాదుకు సంబంధించినదని నేను గ్రహించాను.",
        "May I have your name?": "దయచేసి మీ పేరు చెప్పగలరా?",
        "What is your ward or house number?": "మీ వార్డు లేదా ఇంటి నంబర్ ఏమిటి?",
        "Please describe the water problem you are facing.": "దయచేసి మీరు ఎదుర్కొంటున్న నీటి సమస్యను వివరించండి.",
    },
    "ta-IN": {
        "Could you tell me your full name as registered for the pension?": "ஓய்வூதியத்திற்குப் பதிவு செய்யப்பட்ட உங்கள் முழுப் பெயரைச் சொல்ல முடியுமா?",
        "What type of pension? Old age, widow, or disability pension?": "என்ன வகையான ஓய்வூதியம்? முதியோர், விதவை அல்லது ஊனமுற்றோர் ஓய்வூதியமா?",
        "How many months has the pension been pending?": "ஓய்வூதியம் எத்தனை மாதங்களாக நிலுவையில் உள்ளது?",
        "What is your district and state?": "உங்கள் மாவட்டம் மற்றும் மாநிலம் எது?",
        "Should I submit this request? Please say YES to confirm or NO to make changes.": "இந்த கோரிக்கையை நான் சமர்ப்பிக்க வேண்டுமா? உறுதிப்படுத்த ஆம் அல்லது மாற்றங்களைச் செய்ய இல்லை என்று கூறவும்.",
        "Let me confirm your request. This is a": "உங்கள் கோரிக்கையை உறுதிப்படுத்த அனுமதிக்கவும். இது ஒரு",
        "Details:": "விவரங்கள்:",
        "Your complaint has been filed. Reference number is": "உங்கள் புகார் புகார் செய்யப்பட்டுள்ளது. குறிப்பு எண்",
        "Thank you!": "நன்றி!",
        "I didn't catch that. Please say YES to confirm or NO to redo.": "எனக்கு புரியவில்லை. உறுதிப்படுத்த ஆம் அல்லது மீண்டும் செய்ய இல்லை என்று கூறவும்.",
        "What government issue can I help you with today?": "இன்று நான் உங்களுக்கு என்ன அரசுப் பிரச்சினையில் உதவ முடியும்?",
        "I see this is about Pension Grievance.": "இது ஓய்வூதிய புகார் பற்றியது என்பதை நான் காண்கிறேன்.",
        "I see this is about Water Supply Complaint.": "இது குடிநீர் வழங்கல் புகார் பற்றியது என்பதை நான் காண்கிறேன்.",
        "May I have your name?": "உங்கள் பெயரை நான் தெரிந்து கொள்ளலாமா?",
        "What is your ward or house number?": "உங்கள் வார்டு அல்லது வீட்டு எண் என்ன?",
        "Please describe the water problem you are facing.": "நீங்கள் எதிர்கொள்ளும் குடிநீர் பிரச்சனையை விவரிக்கவும்.",
    }
}


def get_local_translation(text: str, target_lang: str) -> str:
    if target_lang not in LOCAL_TRANSLATIONS:
        return text
    dict_lang = LOCAL_TRANSLATIONS[target_lang]
    if text in dict_lang:
        return dict_lang[text]
    translated = text
    for eng, trans in dict_lang.items():
        translated = translated.replace(eng, trans)
    return translated


async def translate_text(text: str, target_lang: str) -> str:
    if not text or target_lang == "en-IN":
        return text
    try:
        from app.services.bhashini.client import get_bhashini_client, MockBhashiniClient
        client = get_bhashini_client()
        if isinstance(client, MockBhashiniClient):
            import urllib.parse
            import httpx
            lang_prefix = target_lang.split('-')[0].lower()
            encoded_text = urllib.parse.quote(text)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={lang_prefix}&dt=t&q={encoded_text}"
            async with httpx.AsyncClient(timeout=10) as http_client:
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                resp = await http_client.get(url, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                translated_parts = [part[0] for part in data[0] if part and part[0]]
                return "".join(translated_parts)
                
        return await client.translate(text, "en-IN", target_lang)
    except Exception:
        return get_local_translation(text, target_lang)


# ── Main Dialogue Step ────────────────────────────────────────────────────────

async def step_conversation(call_sid: str, mobile: str, utterance: str, language: str = "en-IN") -> DialogueResult:
    """
    Advance the conversation by one citizen turn.
    Returns DialogueResult with what the AI should say next and what action to take.
    """
    session = load_session(call_sid)
    session.mobile = mobile
    session.turn_count += 1

    # Handle escalation at any point
    if is_escalation_request(utterance):
        session.escalated = True
        session.step = "escalated"
        save_session(call_sid, session)
        result = DialogueResult(
            say="I understand. Let me connect you with a human officer. Please hold while I transfer your call. Your concern has been noted.",
            action="escalate",
            session=session,
        )
    # Handle cancellation
    elif is_cancel_request(utterance):
        clear_session(call_sid)
        result = DialogueResult(
            say="Thank you for calling Voice Sarkar. Your call has been ended. Goodbye!",
            action="cancel",
            session=session,
        )
    else:
        step = session.step
        result = None

        # ── GREETING / LANGUAGE DETECTION ────────────────────────────────────────
        if step == "greeting":
            detected_lang = _detect_language(utterance)
            if detected_lang:
                session.language = detected_lang
                session.step = "await_issue"
                greeting = GREETINGS.get(detected_lang, GREETINGS["en-IN"])
                save_session(call_sid, session)
                result = DialogueResult(say=greeting, say_en=GREETINGS["en-IN"], action="ask", session=session)
            else:
                session.step = "language_select"
                save_session(call_sid, session)
                result = DialogueResult(say=LANGUAGE_PROMPT, action="ask", session=session)

        # ── LANGUAGE SELECTION ────────────────────────────────────────────────────
        elif step == "language_select":
            detected_lang = _detect_language(utterance)
            session.language = detected_lang or "en-IN"
            session.step = "await_issue"
            greeting = GREETINGS.get(session.language, GREETINGS["en-IN"])
            save_session(call_sid, session)
            result = DialogueResult(say=greeting, say_en=GREETINGS["en-IN"], action="ask", session=session)

        # ── AWAIT ISSUE ───────────────────────────────────────────────────────────
        elif step == "await_issue":
            intent_key, confidence = detect_intent(utterance)
            if not intent_key:
                save_session(call_sid, session)
                result = DialogueResult(
                    say=(
                        "I am sorry, I didn't understand that. You can tell me about issues like "
                        "pension not received, electricity problem, water supply, ration card, "
                        "RTI application, or road complaints. What is your concern?"
                    ),
                    action="ask",
                    session=session,
                )
            elif intent_key == "status":
                session.step = "done"
                save_session(call_sid, session)
                result = DialogueResult(say=None, action="status", session=session, intent="status", confidence=confidence)
            else:
                session.intent = intent_key
                session.confidence = confidence
                session.slots = {}
                session.slot_queue = list(INTENTS[intent_key]["slots"])
                session.step = "slot_filling"
                save_session(call_sid, session)
                result = _ask_next_slot(session, intro=INTENTS[intent_key]["label"])

        # ── SLOT FILLING ──────────────────────────────────────────────────────────
        elif step == "slot_filling":
            current_slot = session.slot_queue[0] if session.slot_queue else None
            if not current_slot:
                session.step = "confirm"
                save_session(call_sid, session)
                result = _build_confirm(session)
            else:
                value = utterance.strip()
                if is_skip(utterance):
                    value = "not provided"
                elif "number" in current_slot:
                    import re
                    digits = re.search(r'\d[\d\s]{3,}', value)
                    if digits:
                        value = digits.group(0).replace(" ", "")

                session.slots[current_slot] = value
                session.slot_queue.pop(0)
                save_session(call_sid, session)
                result = _ask_next_slot(session)

        # ── CONFIRMATION ──────────────────────────────────────────────────────────
        elif step == "confirm":
            yes_words = ["yes", "haan", "ha", "correct", "confirm", "theek", "sahi", "okay", "ok", "right", "हाँ", "हा", "जी हाँ", "जी", "అవును", "అవున్", "ఎస్", "ஆம்", "சரி", "ஆமாம்"]
            no_words = ["no", "nahi", "wrong", "change", "redo", "incorrect", "नहीं", "ना", "नही", "కాదు", "వద్దు", "నో", "இல்லை"]
            utt_lower = utterance.strip().lower()
            if any(w in utt_lower for w in yes_words):
                session.step = "done"
                save_session(call_sid, session)
                result = DialogueResult(say=None, action="submit", session=session, intent=session.intent, confidence=session.confidence)
            elif any(w in utt_lower for w in no_words):
                session.slot_queue = list(INTENTS[session.intent]["slots"])
                session.slots = {}
                session.step = "slot_filling"
                save_session(call_sid, session)
                result = DialogueResult(
                    say=f"No problem, let us redo that. {INTENTS[session.intent]['prompts'][session.slot_queue[0]]}",
                    action="ask",
                    session=session,
                )
            else:
                result = DialogueResult(say="I didn't catch that. Please say YES to confirm or NO to redo.", action="ask", session=session)

        # ── DONE (loop back) ──────────────────────────────────────────────────────
        elif step == "done":
            intent_key, confidence = detect_intent(utterance)
            if intent_key == "status":
                result = DialogueResult(say=None, action="status", session=session)
            elif intent_key:
                session.step = "await_issue"
                save_session(call_sid, session)
                result = await step_conversation(call_sid, mobile, utterance, language)
            else:
                result = DialogueResult(
                    say="Would you like to file another complaint, or check the status of an existing one?",
                    action="ask",
                    session=session,
                )
        else:
            result = DialogueResult(
                say="Let us start again. What government issue can I help you with today?",
                action="ask",
                session=session,
            )

    # Translate AI response if user preferred a local language
    if result and result.say and session.language != "en-IN":
        if not result.say_en:
            result.say_en = result.say
            result.say = await translate_text(result.say, session.language)

    return result


def _detect_language(text: str) -> Optional[str]:
    t = text.lower().strip()
    for keyword, lang_code in LANGUAGE_KEYWORDS.items():
        if keyword in t:
            return lang_code
    for num, (lang_code, _) in LANGUAGE_OPTIONS.items():
        if num == t:
            return lang_code
    return None


def _ask_next_slot(session: DialogueSession, intro: Optional[str] = None) -> DialogueResult:
    if not session.slot_queue:
        session.step = "confirm"
        save_session(session.session_id, session)
        return _build_confirm(session)
    next_slot = session.slot_queue[0]
    prompt = INTENTS[session.intent]["prompts"][next_slot]
    if intro:
        prompt = f"I see this is about {intro}. {prompt}"
    return DialogueResult(say=prompt, action="ask", session=session)


def _build_confirm(session: DialogueSession) -> DialogueResult:
    summary_parts = [f"{k.replace('_', ' ')}: {v}" for k, v in session.slots.items() if v and v != "not provided"]
    summary = "; ".join(summary_parts)
    intent_label = INTENTS[session.intent]["label"]
    say = (
        f"Let me confirm your request. This is a {intent_label}. Details: {summary}. "
        f"Should I submit this request? Please say YES to confirm or NO to make changes."
    )
    return DialogueResult(say=say, action="ask", session=session)
