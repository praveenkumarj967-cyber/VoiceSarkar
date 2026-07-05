from datetime import datetime

from fastapi import FastAPI, Request, Depends, Header, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db, Base, engine
from app import models
from app.dialogue_engine import (
    step_conversation, load_session, save_session, clear_session,
    gen_complaint_ref, INTENTS,
)
from app.telephony import build_gather_response, build_say_and_hangup, send_sms
from app.portals.mock_adapter import MockPortalAdapter
from app.portals.base import PortalAdapter

app = FastAPI(title="Voice Sarkar")

# Create tables on startup for convenience in dev; use Alembic migrations in production.
Base.metadata.create_all(bind=engine)


def get_portal_adapter() -> PortalAdapter:
    if settings.portal_mode == "rpa":
        raise RuntimeError(
            "PORTAL_MODE=rpa requires a configured RPAPortalAdapter instance per "
            "portal in app/main.py — see app/portals/rpa_adapter.py before enabling."
        )
    return MockPortalAdapter()


def require_admin(x_api_key: str = Header(default="")):
    if x_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# ---------------------------------------------------------------------------
# TELEPHONY WEBHOOKS (point your Twilio number's "A Call Comes In" webhook at
# {PUBLIC_BASE_URL}/voice/incoming)
# ---------------------------------------------------------------------------

@app.post("/voice/incoming")
async def voice_incoming(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    call_sid = form.get("CallSid")
    from_number = form.get("From", "")

    citizen = db.query(models.Citizen).filter_by(mobile_number=from_number).first()
    if not citizen:
        citizen = models.Citizen(mobile_number=from_number, preferred_language="en-IN")
        db.add(citizen)
        db.commit()
        db.refresh(citizen)

    call = models.Call(
        citizen_id=citizen.id, telephony_call_sid=call_sid,
        from_number=from_number, language=citizen.preferred_language or "en-IN",
    )
    db.add(call)
    db.commit()

    clear_session(call_sid)  # fresh conversation state per call
    greeting = ("Namaste, welcome to Voice Sarkar. Please tell me, in your own words, "
                "what government issue you're facing today.")
    twiml = build_gather_response(
        greeting, gather_action=f"{settings.public_base_url}/voice/gather?CallSid={call_sid}",
        language=call.language,
    )
    return Response(content=twiml, media_type="application/xml")


@app.post("/voice/gather")
async def voice_gather(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    call_sid = request.query_params.get("CallSid") or form.get("CallSid")
    speech_result = form.get("SpeechResult", "")

    call = db.query(models.Call).filter_by(telephony_call_sid=call_sid).first()
    if not call:
        return Response(content=build_say_and_hangup("Sorry, something went wrong. Please call again."),
                         media_type="application/xml")

    turn_count = db.query(models.ConversationTurn).filter_by(call_id=call.id).count()
    db.add(models.ConversationTurn(
        call_id=call.id, turn_index=turn_count, speaker="citizen",
        raw_asr_text=speech_result,
    ))
    db.commit()

    result = step_conversation(call_sid, call.from_number, speech_result)

    if result["action"] == "status":
        complaint = (
            db.query(models.Complaint)
            .filter_by(citizen_id=call.citizen_id)
            .order_by(models.Complaint.created_at.desc())
            .first()
        )
        if not complaint:
            say = "I don't see any complaints filed from this number yet. Would you like to file one now?"
        else:
            status_text = {"open": "registered and awaiting action",
                            "in_progress": "currently in progress",
                            "resolved": "marked resolved"}.get(complaint.status, complaint.status)
            say = f"Your most recent request, {complaint.complaint_ref}, is {status_text}."
        twiml = build_gather_response(
            say, gather_action=f"{settings.public_base_url}/voice/gather?CallSid={call_sid}",
            language=call.language,
        )
        return Response(content=twiml, media_type="application/xml")

    if result["action"] == "submit":
        session = load_session(call_sid)
        intent_cfg = INTENTS[session["intent"]]
        adapter = get_portal_adapter()
        submission = adapter.submit(session["intent"], session["slots"], call.from_number)

        ref = gen_complaint_ref(session["intent"])
        complaint = models.Complaint(
            complaint_ref=ref, citizen_id=call.citizen_id, call_id=call.id,
            intent=session["intent"], slots=session["slots"],
            target_portal=intent_cfg["portal"],
            portal_reference_id=submission.portal_reference_id,
            submission_mode=settings.portal_mode, status="open",
        )
        db.add(complaint)
        db.commit()
        db.add(models.StatusHistory(complaint_id=complaint.id, status="open", note="Filed via voice call"))
        db.commit()

        call.outcome = "complaint_filed"
        db.commit()

        sms_body = (f"Voice Sarkar: Your {intent_cfg['label']} request {ref} has been "
                    f"registered with the {intent_cfg['portal']}. Reply STATUS {ref} anytime.")
        try:
            sid = send_sms(call.from_number, sms_body)
            db.add(models.Notification(complaint_id=complaint.id, channel="sms",
                                        to_number=call.from_number, body=sms_body,
                                        provider_message_id=sid, delivery_status="sent"))
            db.commit()
        except Exception as e:
            db.add(models.Notification(complaint_id=complaint.id, channel="sms",
                                        to_number=call.from_number, body=sms_body,
                                        delivery_status=f"failed: {e}"))
            db.commit()

        say = (f"Your request has been filed. Your complaint ID is "
               f"{' '.join(ref)}. I've also sent this by SMS.")
        twiml = build_say_and_hangup(say, language=call.language)
        call.ended_at = datetime.utcnow()
        db.commit()
        clear_session(call_sid)
        return Response(content=twiml, media_type="application/xml")

    twiml = build_gather_response(
        result["say"], gather_action=f"{settings.public_base_url}/voice/gather?CallSid={call_sid}",
        language=call.language,
    )
    return Response(content=twiml, media_type="application/xml")


@app.post("/voice/status-callback")
async def voice_status_callback(request: Request, db: Session = Depends(get_db)):
    """Point Twilio's statusCallback here to record call end time / duration / recording."""
    form = await request.form()
    call_sid = form.get("CallSid")
    call = db.query(models.Call).filter_by(telephony_call_sid=call_sid).first()
    if call and form.get("CallStatus") == "completed":
        call.ended_at = datetime.utcnow()
        rec_url = form.get("RecordingUrl")
        if rec_url:
            call.recording_url = rec_url
        db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# ADMIN / DASHBOARD API (protect behind ADMIN_API_KEY — put a real auth
# system, e.g. OAuth2 + RBAC, in front of this before production use)
# ---------------------------------------------------------------------------

@app.get("/admin/complaints", dependencies=[Depends(require_admin)])
def list_complaints(db: Session = Depends(get_db), limit: int = 100):
    complaints = (
        db.query(models.Complaint)
        .order_by(models.Complaint.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(c.id),
            "complaint_ref": c.complaint_ref,
            "intent": c.intent,
            "target_portal": c.target_portal,
            "status": c.status,
            "created_at": c.created_at.isoformat(),
        }
        for c in complaints
    ]


@app.get("/admin/stats", dependencies=[Depends(require_admin)])
def stats(db: Session = Depends(get_db)):
    total = db.query(models.Complaint).count()
    by_status = {}
    for s in ("open", "in_progress", "resolved", "failed"):
        by_status[s] = db.query(models.Complaint).filter_by(status=s).count()
    return {"total": total, "by_status": by_status}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
