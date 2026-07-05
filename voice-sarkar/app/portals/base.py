from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class SubmissionResult:
    success: bool
    portal_reference_id: Optional[str]
    raw_response: Optional[str] = None
    error: Optional[str] = None


class PortalAdapter(ABC):
    """
    Every government portal integration implements this interface. Swap the
    adapter in app/main.py based on PORTAL_MODE without touching the dialogue
    engine or telephony code.
    """

    @abstractmethod
    def submit(self, intent: str, slots: dict, citizen_mobile: str) -> SubmissionResult:
        ...

    @abstractmethod
    def check_status(self, portal_reference_id: str) -> str:
        ...
