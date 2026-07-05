"""
Government Portal Adapters — interface-driven mock implementations.

Each adapter is clearly marked [MOCK] and documents the real integration requirements.
Replace mock logic with real API calls once official government API access is obtained.
"""
from __future__ import annotations
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


@dataclass
class SubmissionResult:
    success: bool
    portal_reference_id: Optional[str]
    portal_name: str
    message: str
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()


class GovPortalAdapter:
    """Base interface for all government portal adapters."""
    portal_name = "Unknown Portal"

    def submit(self, intent: str, slots: Dict[str, Any], mobile: str) -> SubmissionResult:
        raise NotImplementedError


# ─── CPGRAMS ─────────────────────────────────────────────────────────────────

class CPGRAMSAdapter(GovPortalAdapter):
    """
    [MOCK] CPGRAMS — Centralised Public Grievance Redress And Monitoring System
    Official API: https://pgportal.gov.in/
    Real integration requires: Ministry NIC API credentials + digital signing certificate.
    Contact: darpg-grievance@nic.in
    """
    portal_name = "CPGRAMS"

    def submit(self, intent: str, slots: Dict[str, Any], mobile: str) -> SubmissionResult:
        ref = f"CPGRAMS/{datetime.utcnow().year}/{uuid.uuid4().hex[:8].upper()}"
        logger.info(f"[MOCK-CPGRAMS] Submitting {intent} from {mobile} -> ref {ref}")
        return SubmissionResult(
            success=True,
            portal_reference_id=ref,
            portal_name=self.portal_name,
            message=f"[MOCK] Grievance registered at CPGRAMS. Reference: {ref}. "
                    "Real submission requires official CPGRAMS API credentials.",
        )


# ─── RTI Online ───────────────────────────────────────────────────────────────

class RTIOnlineAdapter(GovPortalAdapter):
    """
    [MOCK] RTI Online Portal — Ministry of Personnel, PG & Pensions
    Official API: https://rtionline.gov.in/
    Real integration requires: RTI Portal API key from MoPP&P.
    """
    portal_name = "RTI Online Portal"

    def submit(self, intent: str, slots: Dict[str, Any], mobile: str) -> SubmissionResult:
        ref = f"RTIOL/{datetime.utcnow().year}/{uuid.uuid4().hex[:6].upper()}"
        logger.info(f"[MOCK-RTI] Filing RTI from {mobile} -> ref {ref}")
        return SubmissionResult(
            success=True,
            portal_reference_id=ref,
            portal_name=self.portal_name,
            message=f"[MOCK] RTI application filed. Registration No: {ref}. "
                    "Actual filing requires RTI Portal API integration.",
        )


# ─── DigiLocker ───────────────────────────────────────────────────────────────

class DigiLockerAdapter(GovPortalAdapter):
    """
    [MOCK] DigiLocker — MeitY
    Official API: https://digilocker.gov.in/api/
    Real integration requires: DigiLocker Partner API credentials (OAuth2).
    """
    portal_name = "DigiLocker"

    def submit(self, intent: str, slots: Dict[str, Any], mobile: str) -> SubmissionResult:
        ref = f"DL/{datetime.utcnow().year}/{uuid.uuid4().hex[:8].upper()}"
        logger.info(f"[MOCK-DIGILOCKER] ID document request from {mobile} -> ref {ref}")
        return SubmissionResult(
            success=True,
            portal_reference_id=ref,
            portal_name=self.portal_name,
            message=f"[MOCK] Document request registered. Ref: {ref}. "
                    "Real integration requires DigiLocker OAuth2 partner credentials.",
        )


# ─── UMANG ────────────────────────────────────────────────────────────────────

class UMANGAdapter(GovPortalAdapter):
    """
    [MOCK] UMANG — Unified Mobile Application for New-age Governance
    Official API: https://web.umang.gov.in/developer/
    Real integration requires: UMANG API registration and department onboarding.
    """
    portal_name = "UMANG Platform"

    def submit(self, intent: str, slots: Dict[str, Any], mobile: str) -> SubmissionResult:
        ref = f"UMANG/{uuid.uuid4().hex[:8].upper()}"
        logger.info(f"[MOCK-UMANG] Service request from {mobile} intent={intent} -> ref {ref}")
        return SubmissionResult(
            success=True,
            portal_reference_id=ref,
            portal_name=self.portal_name,
            message=f"[MOCK] Service routed via UMANG. Ref: {ref}. "
                    "Real integration requires UMANG department API registration.",
        )


# ─── eDistrict ────────────────────────────────────────────────────────────────

class eDistrictAdapter(GovPortalAdapter):
    """
    [MOCK] eDistrict — State/UT level service delivery
    Each state has its own eDistrict portal. No unified federal API.
    Real integration requires: State NIC eDistrict API (varies by state).
    """
    portal_name = "eDistrict Portal"

    def submit(self, intent: str, slots: Dict[str, Any], mobile: str) -> SubmissionResult:
        ref = f"EDU/{uuid.uuid4().hex[:8].upper()}"
        state = slots.get("state", "Unknown")
        logger.info(f"[MOCK-EDISTRICT] Complaint from {mobile} state={state} -> ref {ref}")
        return SubmissionResult(
            success=True,
            portal_reference_id=ref,
            portal_name=f"{self.portal_name} ({state})",
            message=f"[MOCK] Request submitted to {state} eDistrict. Ref: {ref}. "
                    "Real integration requires state-specific eDistrict NIC API.",
        )


# ─── ServicePlus ─────────────────────────────────────────────────────────────

class ServicePlusAdapter(GovPortalAdapter):
    """
    [MOCK] ServicePlus — State service delivery framework
    Official: https://serviceplus.gov.in/
    Real integration requires: ServicePlus API key from NIC.
    """
    portal_name = "ServicePlus"

    def submit(self, intent: str, slots: Dict[str, Any], mobile: str) -> SubmissionResult:
        ref = f"SP/{uuid.uuid4().hex[:8].upper()}"
        logger.info(f"[MOCK-SERVICEPLUS] Request from {mobile} -> ref {ref}")
        return SubmissionResult(
            success=True,
            portal_reference_id=ref,
            portal_name=self.portal_name,
            message=f"[MOCK] Service request registered on ServicePlus. Ref: {ref}.",
        )


# ─── Factory ─────────────────────────────────────────────────────────────────

INTENT_PORTAL_MAP = {
    "pension": CPGRAMSAdapter,
    "electricity": UMANGAdapter,
    "water": eDistrictAdapter,
    "ration": CPGRAMSAdapter,
    "rti": RTIOnlineAdapter,
    "municipal": eDistrictAdapter,
    "id_card": DigiLockerAdapter,
    "health": CPGRAMSAdapter,
    "roads": CPGRAMSAdapter,
    "scholarship": ServicePlusAdapter,
    "status": CPGRAMSAdapter,
}


def get_portal_adapter(intent: str) -> GovPortalAdapter:
    """Returns the appropriate portal adapter for a given intent."""
    adapter_class = INTENT_PORTAL_MAP.get(intent, CPGRAMSAdapter)
    return adapter_class()
