"""
Intent detection engine with dual mode:
1. Rule-based keyword matching (always available, no API key needed)
2. Gemini LLM adapter (plugs in when GEMINI_API_KEY is configured)
"""
from __future__ import annotations
import logging
import re
from typing import Optional, Tuple, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Intent definitions ──────────────────────────────────────────────────────

INTENTS: Dict[str, Dict[str, Any]] = {
    "pension": {
        "label": "Pension Grievance",
        "keywords": ["pension", "widow", "vridha", "old age", "pensioner", "retirement", "annuity"],
        "slots": ["name", "pension_type", "months_pending", "address"],
        "prompts": {
            "name": "Could you tell me your full name as registered for the pension?",
            "pension_type": "What type of pension? Old age, widow, or disability pension?",
            "months_pending": "How many months has the pension been pending?",
            "address": "What is your district and state?",
        },
        "portal": "CPGRAMS — Department of Pension & Pensioners' Welfare",
        "priority": "high",
    },
    "electricity": {
        "label": "Electricity Complaint",
        "keywords": ["electricity", "bijli", "power cut", "no light", "transformer", "meter", "bill", "shock", "wire"],
        "slots": ["name", "consumer_number", "issue_detail", "address"],
        "prompts": {
            "name": "What name is on the electricity connection?",
            "consumer_number": "What is your electricity consumer number? Say 'skip' if you don't know.",
            "issue_detail": "Please describe the problem — power cut, faulty meter, or billing error?",
            "address": "What is your locality or village name?",
        },
        "portal": "State Electricity Board Complaint Portal (via UMANG/ServicePlus)",
        "priority": "high",
    },
    "water": {
        "label": "Water Supply Complaint",
        "keywords": ["water", "pani", "no water", "leakage", "pipeline", "tap", "drinking", "supply"],
        "slots": ["name", "ward_number", "issue_detail"],
        "prompts": {
            "name": "May I have your name?",
            "ward_number": "What is your ward or house number?",
            "issue_detail": "Please describe the water problem you are facing.",
        },
        "portal": "Municipal Water Supply Complaint System (via eDistrict)",
        "priority": "medium",
    },
    "ration": {
        "label": "Ration Card / PDS Issue",
        "keywords": ["ration", "pds", "ration card", "food grain", "fair price", "kerosene", "wheat", "rice subsidy"],
        "slots": ["name", "ration_card_number", "issue_detail", "state"],
        "prompts": {
            "name": "What is the name on the ration card?",
            "ration_card_number": "What is your ration card number? Say 'skip' if you don't have it handy.",
            "issue_detail": "What is the issue — no grain, dealer problem, card not updated, or something else?",
            "state": "Which state are you in?",
        },
        "portal": "Public Distribution System (PDS) — DFPD Portal",
        "priority": "high",
    },
    "rti": {
        "label": "RTI Application",
        "keywords": ["rti", "right to information", "information request", "information act", "document"],
        "slots": ["name", "department", "query", "address"],
        "prompts": {
            "name": "What name should the RTI application be filed under?",
            "department": "Which government department is this RTI about?",
            "query": "What information would you like to request? Please be specific.",
            "address": "What is your postal address for correspondence?",
        },
        "portal": "RTI Online Portal — Ministry of Personnel",
        "priority": "medium",
    },
    "municipal": {
        "label": "Municipal Complaint",
        "keywords": ["road", "pothole", "garbage", "streetlight", "light", "municipal", "sewage", "drainage", "footpath"],
        "slots": ["name", "address", "issue_detail"],
        "prompts": {
            "name": "May I have your name?",
            "address": "What is the exact location or ward number of the issue?",
            "issue_detail": "Please describe the municipal problem.",
        },
        "portal": "Municipal Grievance System (via CPGRAMS/eDistrict)",
        "priority": "medium",
    },
    "id_card": {
        "label": "ID / Document Issue",
        "keywords": ["aadhaar", "pan", "voter id", "passport", "driving licence", "certificate", "birth", "caste", "income"],
        "slots": ["name", "document_type", "issue_detail", "state"],
        "prompts": {
            "name": "May I have your name?",
            "document_type": "Which document — Aadhaar, PAN, voter ID, or another certificate?",
            "issue_detail": "What is the issue — correction, new application, or delay?",
            "state": "In which state are you applying?",
        },
        "portal": "Respective Department Portal (via DigiLocker/UMANG/ServicePlus)",
        "priority": "medium",
    },
    "health": {
        "label": "Health / Ayushman Complaint",
        "keywords": ["hospital", "medicine", "doctor", "health", "ayushman", "abha", "treatment", "nurse", "ambulance"],
        "slots": ["name", "hospital_name", "issue_detail", "state"],
        "prompts": {
            "name": "May I have your name?",
            "hospital_name": "Which hospital or health centre has the issue?",
            "issue_detail": "Please describe the problem — denied treatment, billing issue, or medicine shortage?",
            "state": "Which state is this in?",
        },
        "portal": "National Health Mission / Ayushman Bharat Grievance Portal",
        "priority": "high",
    },
    "roads": {
        "label": "Road / Highway Complaint",
        "keywords": ["highway", "national road", "bridge", "flyover", "construction", "accident spot"],
        "slots": ["name", "road_name", "location", "issue_detail"],
        "prompts": {
            "name": "May I have your name?",
            "road_name": "What is the road or highway name and number?",
            "location": "What is the nearest landmark or milestone?",
            "issue_detail": "What is the problem — pothole, damaged bridge, or accident black spot?",
        },
        "portal": "CPGRAMS — Ministry of Road Transport and Highways",
        "priority": "medium",
    },
    "scholarship": {
        "label": "Scholarship / Education",
        "keywords": ["scholarship", "stipend", "fee", "school", "college", "nsp", "student", "education"],
        "slots": ["name", "institution", "scholarship_type", "issue_detail"],
        "prompts": {
            "name": "What is the student's name?",
            "institution": "Which school or college?",
            "scholarship_type": "Which scholarship scheme — NSP, state scholarship, or another?",
            "issue_detail": "What is the issue — payment not received, application rejected, or something else?",
        },
        "portal": "National Scholarship Portal (NSP) / State Education Department",
        "priority": "medium",
    },
    "status": {
        "label": "Status Check",
        "keywords": ["status", "track", "update", "check", "complaint number", "reference", "progress"],
        "slots": [],
        "prompts": {},
        "portal": "Voice Sarkar Internal",
        "priority": "low",
    },
}

INTENT_PREFIX_MAP = {
    "pension": "PEN", "electricity": "ELE", "water": "WAT",
    "ration": "PDS", "rti": "RTI", "municipal": "MUN",
    "id_card": "IDC", "health": "HLT", "roads": "RDH",
    "scholarship": "SCH", "status": "STS",
}

ESCALATION_KEYWORDS = ["officer", "supervisor", "manager", "human", "person", "help me", "frustrated", "angry"]
CANCEL_KEYWORDS = ["cancel", "quit", "exit", "stop", "bye", "goodbye", "end"]
SKIP_KEYWORDS = ["skip", "don't know", "dont know", "no idea", "not sure"]


def detect_intent(text: str) -> Tuple[Optional[str], float]:
    """
    Detect intent from user utterance.
    Returns (intent_key, confidence) where confidence is 0.0–1.0.
    Uses Gemini LLM if configured, else rule-based keyword matching.
    """
    if settings.gemini_api_key:
        try:
            return _gemini_detect_intent(text)
        except Exception as e:
            logger.warning(f"Gemini intent detection failed, falling back to rules: {e}")
    return _rule_based_detect_intent(text)


def _rule_based_detect_intent(text: str) -> Tuple[Optional[str], float]:
    """Keyword-based intent detection."""
    t = text.lower()
    best_intent = None
    best_score = 0
    for key, cfg in INTENTS.items():
        matches = sum(1 for kw in cfg["keywords"] if kw in t)
        if matches > best_score:
            best_score = matches
            best_intent = key
    confidence = min(0.5 + (best_score * 0.15), 0.95) if best_score > 0 else 0.0
    return (best_intent, confidence) if best_score > 0 else (None, 0.0)


def _gemini_detect_intent(text: str) -> Tuple[Optional[str], float]:
    """Use Gemini to classify intent. Requires GEMINI_API_KEY."""
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    intent_list = ", ".join(INTENTS.keys())
    prompt = f"""You are an AI assistant for a Indian government grievance system.
Classify the citizen's statement into one of these intents: {intent_list}
If none match, reply "none".
Also give a confidence score from 0.0 to 1.0.
Reply ONLY in format: intent_key|confidence
Example: pension|0.9

Citizen says: "{text}"
"""
    response = model.generate_content(prompt)
    result = response.text.strip()
    parts = result.split("|")
    if len(parts) == 2:
        intent_key = parts[0].strip()
        confidence = float(parts[1].strip())
        if intent_key in INTENTS:
            return (intent_key, confidence)
    return (None, 0.0)


def extract_slots(intent: str, text: str) -> Dict[str, Any]:
    """Basic entity extraction from utterance."""
    slots: Dict[str, Any] = {}
    # Extract numbers (consumer numbers, months, etc.)
    numbers = re.findall(r'\b\d{6,14}\b', text)
    if numbers:
        slots["detected_number"] = numbers[0]
    # Extract months mentioned
    months_match = re.search(r'(\d+)\s*month', text, re.I)
    if months_match:
        slots["months_pending"] = months_match.group(1)
    return slots


def is_escalation_request(text: str) -> bool:
    return any(kw in text.lower() for kw in ESCALATION_KEYWORDS)


def is_cancel_request(text: str) -> bool:
    return any(kw in text.lower() for kw in CANCEL_KEYWORDS)


def is_skip(text: str) -> bool:
    return any(kw in text.lower() for kw in SKIP_KEYWORDS)
