import json
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.config import settings

SESSION_TTL_SECONDS = 60 * 20  # a live call shouldn't sit idle for 20+ minutes


class _InMemoryStore:
    """Minimal Redis-compatible in-memory store for local dev (no Redis needed)."""
    def __init__(self):
        self._data = {}

    def get(self, key):
        return self._data.get(key)

    def set(self, key, value, ex=None):
        self._data[key] = value

    def delete(self, key):
        self._data.pop(key, None)


try:
    import redis as _redis
    _client = _redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2)
    _client.ping()
    r = _client
    print("[VoiceSarkar] Connected to Redis.")
except Exception as _e:
    r = _InMemoryStore()
    print(f"[VoiceSarkar] Redis unavailable ({_e}). Using in-memory session store (local dev only).")

INTENTS = {
    "pension": {
        "label": "Pension Grievance",
        "keywords": ["pension", "widow", "vridha", "old age pension", "pensioner"],
        "slots": ["name", "pension_type", "months_pending"],
        "prompts": {
            "name": "Could you tell me your full name, as registered for the pension?",
            "pension_type": "Is this an old-age pension, widow pension, or disability pension?",
            "months_pending": "How many months has the pension been pending?",
        },
        "portal": "State Social Welfare Pension Portal",
    },
    "electricity": {
        "label": "Electricity Complaint",
        "keywords": ["electricity", "bijli", "power cut", "no light", "transformer", "meter"],
        "slots": ["name", "consumer_number", "issue_detail"],
        "prompts": {
            "name": "What name is on the electricity connection?",
            "consumer_number": "What is your electricity consumer number? Say 'skip' if you don't know it.",
            "issue_detail": "Please describe the problem — a power cut, a faulty meter, or a billing error.",
        },
        "portal": "State Electricity Board Complaint Portal",
    },
    "water": {
        "label": "Water Supply Complaint",
        "keywords": ["water", "pani", "no water", "leakage", "pipeline", "tap"],
        "slots": ["name", "address", "issue_detail"],
        "prompts": {
            "name": "May I have your name?",
            "address": "What is your address or ward number?",
            "issue_detail": "Please describe the water problem you're facing.",
        },
        "portal": "Municipal Water Supply Complaint System",
    },
    "ration": {
        "label": "Ration Card / PDS Issue",
        "keywords": ["ration", "pds", "ration card", "food grain", "fair price shop"],
        "slots": ["name", "ration_card_number", "issue_detail"],
        "prompts": {
            "name": "What is the name on the ration card?",
            "ration_card_number": "What is your ration card number? Say 'skip' if you don't have it.",
            "issue_detail": "What exactly is the issue — no grain, a dealer problem, or something else?",
        },
        "portal": "Public Distribution System (PDS) Portal",
    },
    "rti": {
        "label": "RTI Application",
        "keywords": ["rti", "right to information", "information request"],
        "slots": ["name", "department", "query"],
        "prompts": {
            "name": "What name should the RTI application be filed under?",
            "department": "Which government department is this RTI about?",
            "query": "What information would you like to request?",
        },
        "portal": "RTI Online Portal",
    },
    "municipal": {
        "label": "Municipal Complaint",
        "keywords": ["road", "garbage", "streetlight", "municipal", "pothole", "sewage", "drainage"],
        "slots": ["name", "address", "issue_detail"],
        "prompts": {
            "name": "May I have your name?",
            "address": "What is the location or ward number of the issue?",
            "issue_detail": "Please describe the municipal issue.",
        },
        "portal": "Municipal Grievance System",
    },
    "status": {
        "label": "Status Check",
        "keywords": ["status", "track", "update on my complaint", "what happened to my"],
        "slots": [],
        "prompts": {},
    },
}

PREFIX_BY_INTENT = {
    "pension": "PEN", "electricity": "ELE", "water": "WAT",
    "ration": "PDS", "rti": "RTI", "municipal": "MUN",
}


def detect_intent(text: str) -> Optional[str]:
    t = text.lower()
    for key, cfg in INTENTS.items():
        if key == "status":
            continue
        if any(k in t for k in cfg["keywords"]):
            return key
    if any(k in t for k in INTENTS["status"]["keywords"]):
        return "status"
    return None


def extract_digits(text: str) -> Optional[str]:
    m = re.search(r"\d[\d\s]{2,}", text)
    return m.group(0).replace(" ", "") if m else None


def gen_complaint_ref(intent_key: str) -> str:
    prefix = PREFIX_BY_INTENT.get(intent_key, "GEN")
    year = datetime.now(timezone.utc).year
    rand = uuid.uuid4().hex[:6].upper()
    return f"VS-{prefix}-{year}-{rand}"


def _session_key(call_sid: str) -> str:
    return f"vs:session:{call_sid}"


def load_session(call_sid: str) -> dict:
    raw = r.get(_session_key(call_sid))
    if raw:
        return json.loads(raw)
    return {"step": "greeting", "intent": None, "slots": {}, "slot_queue": []}


def save_session(call_sid: str, session: dict):
    r.set(_session_key(call_sid), json.dumps(session), ex=SESSION_TTL_SECONDS)


def clear_session(call_sid: str):
    r.delete(_session_key(call_sid))


def step_conversation(call_sid: str, mobile: str, utterance: str) -> dict:
    """
    Advances the dialogue by exactly one user turn.
    Returns: {"say": str, "done": bool, "action": "ask" | "confirm" | "submit" | "status" | "none",
              "complaint": dict | None}
    This is telephony-agnostic — main.py wraps the "say" text in TwiML.
    """
    session = load_session(call_sid)
    step = session["step"]

    if step in ("greeting", "await_issue"):
        intent_key = detect_intent(utterance)
        if not intent_key:
            save_session(call_sid, session)
            return {"say": "Sorry, I didn't understand. You can say things like "
                            "'my pension has not come', 'electricity complaint', "
                            "or 'status of my complaint'.", "done": False, "action": "ask"}
        if intent_key == "status":
            session["step"] = "done"
            save_session(call_sid, session)
            return {"say": None, "done": False, "action": "status"}

        session["intent"] = intent_key
        session["slots"] = {}
        session["slot_queue"] = list(INTENTS[intent_key]["slots"])
        session["step"] = "slot_filling"
        save_session(call_sid, session)
        return _ask_next_slot(session, call_sid, intro=INTENTS[intent_key]["label"])

    if step == "slot_filling":
        current_slot = session["slot_queue"][0]
        value = utterance.strip()
        if "number" in current_slot and "skip" not in value.lower():
            digits = extract_digits(value)
            if digits:
                value = digits
        session["slots"][current_slot] = value
        session["slot_queue"].pop(0)
        save_session(call_sid, session)
        return _ask_next_slot(session, call_sid)

    if step == "confirm":
        if re.match(r"^(yes|haan|ha|correct|confirm|theek)", utterance.strip(), re.I):
            session["step"] = "done"
            save_session(call_sid, session)
            return {"say": None, "done": False, "action": "submit"}
        else:
            last_slot = list(session["slots"].keys())[-1]
            session["slot_queue"].insert(0, last_slot)
            session["step"] = "slot_filling"
            save_session(call_sid, session)
            return {"say": "No problem, let's redo that. " + INTENTS[session["intent"]]["prompts"][last_slot],
                    "done": False, "action": "ask"}

    if step == "done":
        intent_key = detect_intent(utterance)
        if intent_key == "status":
            return {"say": None, "done": False, "action": "status"}
        if intent_key:
            session["step"] = "await_issue"
            save_session(call_sid, session)
            return step_conversation(call_sid, mobile, utterance)
        return {"say": "Would you like to file another complaint, or check the status of an existing one?",
                "done": False, "action": "ask"}

    return {"say": "Let's start again — what government issue can I help with?", "done": False, "action": "ask"}


def _ask_next_slot(session: dict, call_sid: str, intro: Optional[str] = None) -> dict:
    if not session["slot_queue"]:
        session["step"] = "confirm"
        save_session(call_sid, session)
        summary = ", ".join(f"{k.replace('_',' ')}: {v}" for k, v in session["slots"].items())
        text = f"Just to confirm — {INTENTS[session['intent']]['label']}, details: {summary}. " \
               f"Should I submit this? Please say yes or no."
        return {"say": text, "done": False, "action": "ask"}

    next_slot = session["slot_queue"][0]
    prompt = INTENTS[session["intent"]]["prompts"][next_slot]
    if intro:
        prompt = f"This is a {intro} case. {prompt}"
    return {"say": prompt, "done": False, "action": "ask"}
