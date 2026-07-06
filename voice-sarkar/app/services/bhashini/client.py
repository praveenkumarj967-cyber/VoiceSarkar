"""
Bhashini ULCA API Client — Speech-to-Text, Text-to-Speech, Translation.

REAL INTEGRATION: Requires valid BHASHINI_USER_ID and BHASHINI_ULCA_API_KEY
from https://bhashini.gov.in

Falls back to MockBhashiniClient when credentials are not configured.
"""
from __future__ import annotations
import base64
import logging
from typing import Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)


class BhashiniError(Exception):
    pass


class BhashiniClient:
    """Real Bhashini ULCA API client."""

    def __init__(self):
        self.user_id = settings.bhashini_user_id
        self.api_key = settings.bhashini_ulca_api_key
        self.pipeline_id = settings.bhashini_pipeline_id
        self.config_url = settings.bhashini_config_url
        self._pipeline_config: Optional[dict] = None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=4))
    async def _get_pipeline_config(self, task_type: str, source_lang: str, target_lang: str) -> dict:
        headers = {
            "userID": self.user_id,
            "ulcaApiKey": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "pipelineTasks": [{"taskType": task_type, "config": {"language": {"sourceLanguage": source_lang, "targetLanguage": target_lang}}}],
            "pipelineRequestConfig": {"pipelineId": self.pipeline_id},
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(self.config_url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def speech_to_text(self, audio_bytes: bytes, source_language: str = "en-IN") -> str:
        """Convert speech audio bytes to text via Bhashini ASR."""
        try:
            config = await self._get_pipeline_config("asr", source_language, source_language)
            task = config["pipelineResponseConfig"][0]
            service_id = task["config"][0]["serviceId"]
            inference_url = task["config"][0]["inferenceEndPoint"]["callbackUrl"]
            headers = {task["config"][0]["inferenceEndPoint"]["iHeaderName"]: task["config"][0]["inferenceEndPoint"]["iHeaderValue"]}

            audio_b64 = base64.b64encode(audio_bytes).decode()
            payload = {
                "pipelineTasks": [{"taskType": "asr", "config": {"language": {"sourceLanguage": source_language}, "serviceId": service_id, "audioFormat": "wav", "samplingRate": 16000}}],
                "inputData": {"audio": [{"audioContent": audio_b64}]},
            }
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(inference_url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return data["pipelineResponse"][0]["output"][0]["source"]
        except Exception as e:
            logger.error(f"Bhashini ASR error: {e}")
            raise BhashiniError(f"ASR failed: {e}") from e

    async def text_to_speech(self, text: str, target_language: str = "en-IN") -> bytes:
        """Convert text to speech audio via Bhashini TTS. Returns WAV bytes."""
        try:
            config = await self._get_pipeline_config("tts", target_language, target_language)
            task = config["pipelineResponseConfig"][0]
            service_id = task["config"][0]["serviceId"]
            inference_url = task["config"][0]["inferenceEndPoint"]["callbackUrl"]
            headers = {task["config"][0]["inferenceEndPoint"]["iHeaderName"]: task["config"][0]["inferenceEndPoint"]["iHeaderValue"]}

            payload = {
                "pipelineTasks": [{"taskType": "tts", "config": {"language": {"sourceLanguage": target_language}, "serviceId": service_id, "gender": "female", "samplingRate": 8000}}],
                "inputData": {"input": [{"source": text}]},
            }
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(inference_url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                audio_b64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
                return base64.b64decode(audio_b64)
        except Exception as e:
            logger.error(f"Bhashini TTS error: {e}")
            raise BhashiniError(f"TTS failed: {e}") from e

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text between languages via Bhashini NMT."""
        try:
            config = await self._get_pipeline_config("translation", source_lang, target_lang)
            task = config["pipelineResponseConfig"][0]
            service_id = task["config"][0]["serviceId"]
            inference_url = task["config"][0]["inferenceEndPoint"]["callbackUrl"]
            headers = {task["config"][0]["inferenceEndPoint"]["iHeaderName"]: task["config"][0]["inferenceEndPoint"]["iHeaderValue"]}

            payload = {
                "pipelineTasks": [{"taskType": "translation", "config": {"language": {"sourceLanguage": source_lang, "targetLanguage": target_lang}, "serviceId": service_id}}],
                "inputData": {"input": [{"source": text}]},
            }
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.post(inference_url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return data["pipelineResponse"][0]["output"][0]["target"]
        except Exception as e:
            logger.error(f"Bhashini translate error: {e}")
            raise BhashiniError(f"Translation failed: {e}") from e


class MockBhashiniClient:
    """
    Mock Bhashini client for local development and testing.
    Returns realistic fake responses. No API keys required.
    """

    async def speech_to_text(self, audio_bytes: bytes, source_language: str = "en-IN") -> str:
        return "[Simulated ASR output: citizen speech recognized]"

    async def text_to_speech(self, text: str, target_language: str = "en-IN") -> bytes:
        return b"\x00" * 1024  # Empty WAV-like bytes placeholder

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        return f"[Translated to {target_lang}]: {text}"


def get_bhashini_client():
    """Returns real client if credentials exist and are not placeholders, else mock."""
    uid = settings.bhashini_user_id
    key = settings.bhashini_ulca_api_key
    if uid and key and "your_" not in uid and "your_" not in key:
        return BhashiniClient()
    logger.warning("Bhashini credentials not configured — using MockBhashiniClient")
    return MockBhashiniClient()
