"""Voice webhook endpoints + simulation API"""
from __future__ import annotations
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.config import settings
from app.models import Complaint, StatusHistory, Notification
from app.models.call import Call, ConversationTurn
from app.models.citizen import Citizen
from app.schemas.complaint import VoiceSimulateRequest, VoiceSimulateResponse
from app.services.dialogue.manager import step_conversation, load_session, clear_session
from app.services.gov_portals.adapters import get_portal_adapter
from app.services.ai.intent_engine import INTENTS, INTENT_PREFIX_MAP
from app.services.telephony.providers import get_telephony_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["Voice"])


def _gen_ref(intent: str) -> str:
    prefix = INTENT_PREFIX_MAP.get(intent, "GEN")
    year = datetime.now(timezone.utc).year
    rand = uuid.uuid4().hex[:6].upper()
    return f"VS-{prefix}-{year}-{rand}"


def _get_or_create_citizen(db: Session, mobile: str) -> Citizen:
    citizen = db.query(Citizen).filter_by(mobile_number=mobile).first()
    if not citizen:
        citizen = Citizen(mobile_number=mobile, preferred_language="en-IN")
        db.add(citizen)
        db.commit()
        db.refresh(citizen)
    return citizen


# ─── Twilio/Exotel Webhooks ──────────────────────────────────────────────────

@router.post("/incoming")
async def voice_incoming(request: Request, db: Session = Depends(get_db)):
    """Entry webhook — called when a new call arrives."""
    form = await request.form()
    call_sid = form.get("CallSid", f"sim_{uuid.uuid4().hex[:8]}")
    from_number = form.get("From", "+910000000000")

    citizen = _get_or_create_citizen(db, from_number)
    call = Call(telephony_call_sid=call_sid, citizen_id=citizen.id, from_number=from_number,
                language=citizen.preferred_language, provider=settings.telephony_provider)
    db.add(call)
    db.commit()

    clear_session(call_sid)
    provider = get_telephony_provider()
    greeting = (
        "Namaste! Welcome to Voice Sarkar — your voice-based government service centre. "
        "I can help you file complaints, submit RTI requests, and check their status. "
        "Which language do you prefer? You can say Hindi, Telugu, Tamil, or English."
    )
    twiml = provider.build_gather_response(
        greeting,
        gather_action=f"{settings.public_base_url}/api/v1/voice/gather?CallSid={call_sid}",
        language="en-IN",
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/gather")
async def voice_gather(request: Request, db: Session = Depends(get_db)):
    """Called after citizen speaks — process utterance and respond."""
    form = await request.form()
    call_sid = request.query_params.get("CallSid") or form.get("CallSid", "")
    speech_result = form.get("SpeechResult", "")

    call = db.query(Call).filter_by(telephony_call_sid=call_sid).first()
    provider = get_telephony_provider()

    if not call:
        return Response(content=provider.build_say_hangup("Sorry, something went wrong. Please call again."), media_type="application/xml")

    # Log turn
    turn_count = db.query(ConversationTurn).filter_by(call_id=call.id).count()
    db.add(ConversationTurn(call_id=call.id, turn_index=turn_count, speaker="citizen", raw_asr_text=speech_result))
    db.commit()

    # Advance dialogue
    result = step_conversation(call_sid, call.from_number, speech_result, call.language)
    citizen = db.query(Citizen).filter_by(id=call.citizen_id).first()

    gather_url = f"{settings.public_base_url}/api/v1/voice/gather?CallSid={call_sid}"

    # Log AI turn
    db.add(ConversationTurn(call_id=call.id, turn_index=turn_count + 1, speaker="ai",
                            raw_asr_text=result.say, detected_intent=result.intent,
                            confidence=int((result.confidence or 0) * 100)))
    db.commit()

    if result.action == "status":
        complaint = (db.query(Complaint).filter_by(citizen_id=call.citizen_id)
                     .order_by(Complaint.created_at.desc()).first())
        if not complaint:
            say = "I don't see any complaints filed from this number. Would you like to file one now?"
        else:
            status_map = {"open": "registered and awaiting action", "in_progress": "currently in progress",
                          "resolved": "resolved", "escalated": "escalated to a senior officer"}
            say = (f"Your most recent request reference {complaint.complaint_ref} is "
                   f"{status_map.get(complaint.status, complaint.status)}.")
        return Response(content=provider.build_gather_response(say, gather_url, call.language), media_type="application/xml")

    if result.action == "submit":
        session = load_session(call_sid)
        intent_cfg = INTENTS[session.intent]
        adapter = get_portal_adapter(session.intent)
        submission = adapter.submit(session.intent, session.slots, call.from_number)

        ref = _gen_ref(session.intent)
        complaint = Complaint(
            complaint_ref=ref, citizen_id=call.citizen_id, call_id=call.id,
            intent=session.intent, slots=session.slots,
            target_portal=intent_cfg["portal"],
            portal_reference_id=submission.portal_reference_id,
            submission_mode=settings.portal_mode,
            priority=intent_cfg.get("priority", "medium"),
            status="open",
        )
        db.add(complaint)
        db.commit()
        db.add(StatusHistory(complaint_id=complaint.id, status="open", changed_by="system",
                             note="Filed via voice call"))
        db.commit()

        # SMS notification
        sms_body = (f"Voice Sarkar: Your {intent_cfg['label']} complaint {ref} has been registered. "
                    f"Portal: {intent_cfg['portal'][:40]}. Status: OPEN. "
                    f"Call 1800-XXX-XXXX to check status.")
        try:
            msg_sid = provider.send_sms(call.from_number, sms_body)
            db.add(Notification(complaint_id=complaint.id, channel="sms",
                                to_address=call.from_number, body=sms_body,
                                provider_message_id=msg_sid, delivery_status="sent"))
        except Exception as e:
            db.add(Notification(complaint_id=complaint.id, channel="sms",
                                to_address=call.from_number, body=sms_body,
                                delivery_status=f"failed: {e}"))
        db.commit()

        call.outcome = "complaint_filed"
        call.ended_at = datetime.utcnow()
        db.commit()
        clear_session(call_sid)

        ref_spoken = " ".join(ref)
        say = (f"Your {intent_cfg['label']} complaint has been filed. "
               f"Your complaint reference number is {ref_spoken}. "
               f"We have also sent this to your phone by SMS. "
               f"Thank you for using Voice Sarkar. Goodbye!")
        return Response(content=provider.build_say_hangup(say, call.language), media_type="application/xml")

    if result.action in ("escalate", "cancel"):
        call.outcome = result.action
        call.ended_at = datetime.utcnow()
        db.commit()
        return Response(content=provider.build_say_hangup(result.say, call.language), media_type="application/xml")

    return Response(
        content=provider.build_gather_response(result.say, gather_url, call.language),
        media_type="application/xml",
    )


@router.post("/status-callback")
async def voice_status_callback(request: Request, db: Session = Depends(get_db)):
    """Twilio/Exotel call status callback."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    call = db.query(Call).filter_by(telephony_call_sid=call_sid).first()
    if call and form.get("CallStatus") == "completed":
        call.ended_at = datetime.utcnow()
        duration = form.get("CallDuration")
        if duration:
            call.duration_seconds = int(duration)
        rec_url = form.get("RecordingUrl")
        if rec_url:
            call.recording_url = rec_url
        db.commit()
    return {"ok": True}


@router.post("/recording-callback")
async def recording_callback(request: Request, db: Session = Depends(get_db)):
    """Handle recording ready callback."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    recording_url = form.get("RecordingUrl", "")
    call = db.query(Call).filter_by(telephony_call_sid=call_sid).first()
    if call and recording_url:
        call.recording_url = recording_url
        db.commit()
    return {"ok": True}


# ─── Simulation Endpoint ─────────────────────────────────────────────────────

@router.post("/simulate", response_model=VoiceSimulateResponse)
def simulate_voice_call(payload: VoiceSimulateRequest, db: Session = Depends(get_db)):
    """
    Simulate a complete voice call without real telephony.
    Runs through the dialogue engine with provided utterances.
    Useful for testing and development.
    """
    call_sid = f"sim_{uuid.uuid4().hex[:12]}"
    mobile = payload.mobile
    language = payload.language

    citizen = _get_or_create_citizen(db, mobile)
    call = Call(telephony_call_sid=call_sid, citizen_id=citizen.id, from_number=mobile,
                language=language, provider="simulate")
    db.add(call)
    db.commit()

    transcript = []
    complaint_ref = None
    final_status = "in_progress"

    # Initial greeting turn
    transcript.append({"speaker": "ai", "text": "Namaste! Welcome to Voice Sarkar. What language do you prefer?"})

    for utterance in payload.utterances:
        transcript.append({"speaker": "citizen", "text": utterance})
        result = step_conversation(call_sid, mobile, utterance, language)

        if result.say:
            transcript.append({"speaker": "ai", "text": result.say})

        if result.action == "submit":
            session = load_session(call_sid)
            intent_cfg = INTENTS.get(session.intent, {})
            adapter = get_portal_adapter(session.intent)
            submission = adapter.submit(session.intent, session.slots, mobile)
            ref = _gen_ref(session.intent)

            complaint = Complaint(
                complaint_ref=ref, citizen_id=citizen.id, call_id=call.id,
                intent=session.intent, slots=session.slots,
                target_portal=intent_cfg.get("portal", "Unknown"),
                portal_reference_id=submission.portal_reference_id,
                submission_mode="simulate", priority=intent_cfg.get("priority", "medium"), status="open",
            )
            db.add(complaint)
            db.commit()
            db.add(StatusHistory(complaint_id=complaint.id, status="open", changed_by="system",
                                 note="Filed via call simulation"))
            db.commit()
            complaint_ref = ref
            final_status = "complaint_filed"
            transcript.append({"speaker": "ai", "text": f"Your complaint {ref} has been filed! SMS sent."})
            clear_session(call_sid)
            break
        elif result.action in ("cancel", "escalate"):
            final_status = result.action
            break

    call.outcome = final_status
    call.ended_at = datetime.utcnow()
    db.commit()

    return VoiceSimulateResponse(
        session_id=call_sid,
        transcript=transcript,
        complaint_ref=complaint_ref,
        final_status=final_status,
    )
