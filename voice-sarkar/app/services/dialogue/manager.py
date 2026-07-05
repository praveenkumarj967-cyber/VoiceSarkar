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


# ── Main Dialogue Step ────────────────────────────────────────────────────────

def step_conversation(call_sid: str, mobile: str, utterance: str, language: str = "en-IN") -> DialogueResult:
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
        return DialogueResult(
            say="I understand. Let me connect you with a human officer. Please hold while I transfer your call. Your concern has been noted.",
            action="escalate",
            session=session,
        )

    # Handle cancellation
    if is_cancel_request(utterance):
        clear_session(call_sid)
        return DialogueResult(
            say="Thank you for calling Voice Sarkar. Your call has been ended. Goodbye!",
            action="cancel",
            session=session,
        )

    step = session.step

    # ── GREETING / LANGUAGE DETECTION ────────────────────────────────────────
    if step == "greeting":
        # Try to detect language from utterance
        detected_lang = _detect_language(utterance)
        if detected_lang:
            session.language = detected_lang
            session.step = "await_issue"
            greeting = GREETINGS.get(detected_lang, GREETINGS["en-IN"])
            save_session(call_sid, session)
            return DialogueResult(say=greeting, action="ask", session=session)
        # Ask for language preference
        session.step = "language_select"
        save_session(call_sid, session)
        return DialogueResult(say=LANGUAGE_PROMPT, action="ask", session=session)

    # ── LANGUAGE SELECTION ────────────────────────────────────────────────────
    if step == "language_select":
        detected_lang = _detect_language(utterance)
        session.language = detected_lang or "en-IN"
        session.step = "await_issue"
        greeting = GREETINGS.get(session.language, GREETINGS["en-IN"])
        save_session(call_sid, session)
        return DialogueResult(say=greeting, action="ask", session=session)

    # ── AWAIT ISSUE ───────────────────────────────────────────────────────────
    if step == "await_issue":
        intent_key, confidence = detect_intent(utterance)
        if not intent_key:
            save_session(call_sid, session)
            return DialogueResult(
                say=(
                    "I am sorry, I didn't understand that. You can tell me about issues like "
                    "pension not received, electricity problem, water supply, ration card, "
                    "RTI application, or road complaints. What is your concern?"
                ),
                action="ask",
                session=session,
            )
        if intent_key == "status":
            session.step = "done"
            save_session(call_sid, session)
            return DialogueResult(say=None, action="status", session=session, intent="status", confidence=confidence)

        session.intent = intent_key
        session.confidence = confidence
        session.slots = {}
        session.slot_queue = list(INTENTS[intent_key]["slots"])
        session.step = "slot_filling"
        save_session(call_sid, session)
        return _ask_next_slot(session, intro=INTENTS[intent_key]["label"])

    # ── SLOT FILLING ──────────────────────────────────────────────────────────
    if step == "slot_filling":
        current_slot = session.slot_queue[0] if session.slot_queue else None
        if not current_slot:
            session.step = "confirm"
            save_session(call_sid, session)
            return _build_confirm(session)

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
        return _ask_next_slot(session)

    # ── CONFIRMATION ──────────────────────────────────────────────────────────
    if step == "confirm":
        yes_words = ["yes", "haan", "ha", "correct", "confirm", "theek", "sahi", "okay", "ok", "right"]
        no_words = ["no", "nahi", "nahi", "wrong", "change", "redo", "incorrect"]
        utt_lower = utterance.strip().lower()
        if any(w in utt_lower for w in yes_words):
            session.step = "done"
            save_session(call_sid, session)
            return DialogueResult(say=None, action="submit", session=session, intent=session.intent, confidence=session.confidence)
        elif any(w in utt_lower for w in no_words):
            # Restart slot filling
            session.slot_queue = list(INTENTS[session.intent]["slots"])
            session.slots = {}
            session.step = "slot_filling"
            save_session(call_sid, session)
            return DialogueResult(
                say=f"No problem, let us redo that. {INTENTS[session.intent]['prompts'][session.slot_queue[0]]}",
                action="ask",
                session=session,
            )
        else:
            return DialogueResult(say="I didn't catch that. Please say YES to confirm or NO to redo.", action="ask", session=session)

    # ── DONE (loop back) ──────────────────────────────────────────────────────
    if step == "done":
        intent_key, confidence = detect_intent(utterance)
        if intent_key == "status":
            return DialogueResult(say=None, action="status", session=session)
        if intent_key:
            session.step = "await_issue"
            save_session(call_sid, session)
            return step_conversation(call_sid, mobile, utterance, language)
        return DialogueResult(
            say="Would you like to file another complaint, or check the status of an existing one?",
            action="ask",
            session=session,
        )

    return DialogueResult(
        say="Let us start again. What government issue can I help you with today?",
        action="ask",
        session=session,
    )


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
