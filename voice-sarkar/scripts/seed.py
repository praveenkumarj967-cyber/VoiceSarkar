"""Seed script — populates sample data for development and demo."""
from __future__ import annotations
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db import engine, Base, SessionLocal
from app.models import User, Citizen, Complaint, StatusHistory, Call, ConversationTurn, AuditLog
from app.core.security import get_password_hash
import uuid, random
from datetime import datetime, timedelta

INTENTS = ["pension", "electricity", "water", "ration", "rti", "municipal", "health", "roads"]
STATUSES = ["open", "in_progress", "resolved", "escalated"]
LANGUAGES = ["en-IN", "hi-IN", "te-IN", "ta-IN", "mr-IN", "bn-IN"]
PORTALS = {
    "pension": "CPGRAMS", "electricity": "UMANG", "water": "eDistrict",
    "ration": "CPGRAMS", "rti": "RTI Online", "municipal": "eDistrict",
    "health": "CPGRAMS", "roads": "CPGRAMS",
}

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).count() > 2:
            print("DB already seeded. Skipping.")
            return

        # Users
        admin = User(email="admin@voicesarkar.gov.in", hashed_password=get_password_hash("Admin@123"),
                     full_name="System Administrator", role="admin")
        officer1 = User(email="officer1@voicesarkar.gov.in", hashed_password=get_password_hash("Officer@123"),
                        full_name="Ananya Sharma", role="officer")
        officer2 = User(email="officer2@voicesarkar.gov.in", hashed_password=get_password_hash("Officer@123"),
                        full_name="Rajesh Verma", role="officer")
        db.add_all([admin, officer1, officer2])
        db.commit()
        print("Created 3 users")

        # Citizens
        citizens = []
        mobiles = ["+919876543210", "+918765432109", "+917654321098", "+916543210987", "+915432109876"]
        names = ["Ramesh Kumar", "Sunita Devi", "Mohammed Ali", "Priya Nair", "Suresh Babu"]
        for i, (mob, name) in enumerate(zip(mobiles, names)):
            c = Citizen(mobile_number=mob, full_name=name,
                        preferred_language=LANGUAGES[i % len(LANGUAGES)])
            citizens.append(c)
            db.add(c)
        db.commit()
        print("Created 5 citizens")

        # Calls + Complaints
        complaint_count = 0
        for i, citizen in enumerate(citizens):
            for j in range(2):
                call_sid = f"CA{uuid.uuid4().hex[:30]}"
                call = Call(telephony_call_sid=call_sid, citizen_id=citizen.id,
                            from_number=citizen.mobile_number, language=citizen.preferred_language,
                            provider="twilio", outcome="complaint_filed",
                            started_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                            ended_at=datetime.utcnow() - timedelta(days=random.randint(0, 1)),
                            duration_seconds=random.randint(60, 300))
                db.add(call)
                db.commit()

                intent = INTENTS[(i + j) % len(INTENTS)]
                status = STATUSES[(i + j) % len(STATUSES)]
                prefix = {"pension":"PEN","electricity":"ELE","water":"WAT","ration":"PDS",
                          "rti":"RTI","municipal":"MUN","health":"HLT","roads":"RDH"}.get(intent,"GEN")
                ref = f"VS-{prefix}-2026-{uuid.uuid4().hex[:6].upper()}"

                complaint = Complaint(
                    complaint_ref=ref, citizen_id=citizen.id, call_id=call.id,
                    assigned_officer_id=officer1.id if j % 2 == 0 else officer2.id,
                    intent=intent, target_portal=PORTALS.get(intent, "CPGRAMS"),
                    portal_reference_id=f"CPGRAMS/2026/{uuid.uuid4().hex[:8].upper()}",
                    submission_mode="mock", status=status, priority=random.choice(["low","medium","high"]),
                    slots={"name": citizen.full_name, "issue_detail": f"Sample {intent} issue"},
                    resolved_at=datetime.utcnow() if status == "resolved" else None,
                )
                db.add(complaint)
                db.commit()

                db.add(StatusHistory(complaint_id=complaint.id, status="open", changed_by="system",
                                     note="Filed via voice call"))
                if status in ("in_progress", "resolved"):
                    db.add(StatusHistory(complaint_id=complaint.id, status="in_progress",
                                         changed_by=officer1.id, note="Under review"))
                if status == "resolved":
                    db.add(StatusHistory(complaint_id=complaint.id, status="resolved",
                                         changed_by=officer1.id, note="Issue resolved"))
                db.commit()

                db.add(ConversationTurn(call_id=call.id, turn_index=0, speaker="ai",
                                        raw_asr_text="Welcome to Voice Sarkar"))
                db.add(ConversationTurn(call_id=call.id, turn_index=1, speaker="citizen",
                                        raw_asr_text=f"I have a {intent} problem",
                                        detected_intent=intent, confidence=85))
                db.commit()
                complaint_count += 1

        print(f"Created {complaint_count} complaints with calls and history")
        db.add(AuditLog(actor_type="system", action="seed_data", entity_type="database",
                        new_value={"complaints": complaint_count, "citizens": len(citizens)}))
        db.commit()
        print("Seed complete! Login: admin@voicesarkar.gov.in / Admin@123")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
