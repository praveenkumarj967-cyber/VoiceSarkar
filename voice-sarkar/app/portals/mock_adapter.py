import random
import uuid

from app.portals.base import PortalAdapter, SubmissionResult


class MockPortalAdapter(PortalAdapter):
    """
    Default adapter. Records the complaint in our own database with a
    generated reference and never contacts any external government system.
    Use this until you have either (a) an official API agreement with the
    relevant department, or (b) legal sign-off for RPA-based submission.
    """

    def submit(self, intent: str, slots: dict, citizen_mobile: str) -> SubmissionResult:
        return SubmissionResult(
            success=True,
            portal_reference_id=f"MOCK-{uuid.uuid4().hex[:8].upper()}",
            raw_response="simulated submission — no external portal contacted",
        )

    def check_status(self, portal_reference_id: str) -> str:
        return random.choice(["open", "in_progress", "resolved"])
