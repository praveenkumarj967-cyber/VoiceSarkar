"""
EXPERIMENTAL — READ BEFORE ENABLING (PORTAL_MODE=rpa)
======================================================
Most government grievance portals (CPGRAMS, state portals, electricity boards,
RTI Online, etc.) do not currently offer a public, documented API for third
parties to submit citizen complaints on their behalf. Two honest paths exist:

  1. Formal integration — the "right" way. Your organisation applies for API
     access / a MoU with the owning department (e.g. DARPG for CPGRAMS, the
     state e-District mission, DISCOMs for electricity). This is the only
     path suitable for a real national-scale deployment, because:
       - it gives you a stable contract instead of a page structure that can
         change without notice and silently break submissions
       - most portals require a logged-in citizen/department account,
         CAPTCHA, and OTP steps that automation cannot legitimately bypass
       - submitting on a citizen's behalf without their portal login may
         violate the portal's terms of service or applicable law depending
         on jurisdiction and the specific portal's rules — get sign-off from
         your legal/compliance team before automating against any specific
         site, not just this one

  2. Browser automation (RPA) — a stop-gap ONLY where the department has
     given written approval for this exact approach, ideally with a shared
     service account and rate limits agreed in advance. This file is a
     generic, portal-agnostic skeleton for that scenario — it does not target
     or attempt to defeat any specific portal's authentication, CAPTCHA, or
     anti-automation controls, and you must not extend it to do so. Treat
     CAPTCHA/OTP as a hard stop: route to a human operator queue instead of
     trying to automate around it.

Until (1) or an approved (2) is in place, use MockPortalAdapter — it lets you
run the full voice pipeline today and swap this in later without touching
anything else.
"""
from playwright.sync_api import sync_playwright

from app.portals.base import PortalAdapter, SubmissionResult


class RPAPortalAdapter(PortalAdapter):
    def __init__(self, portal_url: str, field_selectors: dict, submit_selector: str,
                 reference_selector: str, credentials: dict | None = None):
        """
        portal_url: the department-approved form URL
        field_selectors: {"name": "#applicantName", "issue_detail": "#complaintText", ...}
        submit_selector: CSS selector for the submit button
        reference_selector: CSS selector for the element containing the
                             generated complaint/reference number after submit
        credentials: optional shared service-account login, only if the
                     department has explicitly approved automated login
        """
        self.portal_url = portal_url
        self.field_selectors = field_selectors
        self.submit_selector = submit_selector
        self.reference_selector = reference_selector
        self.credentials = credentials

    def submit(self, intent: str, slots: dict, citizen_mobile: str) -> SubmissionResult:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(self.portal_url, wait_until="networkidle")

                # Hard stop on any CAPTCHA/OTP challenge — never attempt to solve these.
                if page.locator("text=/captcha/i").count() > 0 or \
                   page.locator("text=/otp/i").count() > 0:
                    browser.close()
                    return SubmissionResult(
                        success=False, portal_reference_id=None,
                        error="Portal requires CAPTCHA/OTP — routed to human operator queue.",
                    )

                for slot_name, value in {**slots, "mobile": citizen_mobile}.items():
                    selector = self.field_selectors.get(slot_name)
                    if selector and value:
                        page.fill(selector, str(value))

                page.click(self.submit_selector)
                page.wait_for_selector(self.reference_selector, timeout=15000)
                ref = page.locator(self.reference_selector).inner_text().strip()

                browser.close()
                return SubmissionResult(success=True, portal_reference_id=ref)
        except Exception as e:
            return SubmissionResult(success=False, portal_reference_id=None, error=str(e))

    def check_status(self, portal_reference_id: str) -> str:
        # Real implementation: navigate to the portal's status-lookup page,
        # search by portal_reference_id, and parse the displayed status text.
        raise NotImplementedError(
            "Implement per-portal once you have written approval for the target site."
        )
