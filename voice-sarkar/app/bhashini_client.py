"""
Real Bhashini integration, following the actual ULCA API contract:
https://bhashini.gitbook.io/bhashini-apis

Flow:
1. Pipeline Config call (once, cached) -> tells us which serviceId to use for
   ASR/Translation/TTS for a given language pair, and gives us the real
   inference endpoint + auth header to use for step 2.
2. Pipeline Compute call -> does the actual ASR / translation / TTS work.

You MUST register at https://bhashini.gov.in, generate a ULCA API key from
"My Profile", and set BHASHINI_USER_ID / BHASHINI_ULCA_API_KEY / BHASHINI_PIPELINE_ID
in your .env before this will work. The pipeline ID above is commonly cited in
public samples but Bhashini periodically rotates/adds pipelines — always confirm
the current ID from the ULCA portal rather than trusting a hardcoded value long-term.
"""
from functools import lru_cache
from typing import Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

LANG_MAP = {
    "en-IN": "en", "hi-IN": "hi", "te-IN": "te",
    "ta-IN": "ta", "mr-IN": "mr", "bn-IN": "bn",
}


class BhashiniError(RuntimeError):
    pass


class BhashiniClient:
    def __init__(self):
        self._compute_endpoint: Optional[str] = None
        self._compute_auth_header: Optional[dict] = None
        self._service_ids: dict = {}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    def _load_pipeline_config(self, source_lang: str, target_lang: str = "en"):
        """Pipeline Config Call — resolves serviceIds + the real compute endpoint."""
        payload = {
            "pipelineTasks": [
                {"taskType": "asr", "config": {"language": {"sourceLanguage": source_lang}}},
                {"taskType": "translation", "config": {"language": {
                    "sourceLanguage": source_lang, "targetLanguage": target_lang}}},
                {"taskType": "tts", "config": {"language": {"sourceLanguage": source_lang}}},
            ],
            "pipelineRequestConfig": {"pipelineId": settings.bhashini_pipeline_id},
        }
        headers = {
            "userID": settings.bhashini_user_id,
            "ulcaApiKey": settings.bhashini_ulca_api_key,
            "Content-Type": "application/json",
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(settings.bhashini_config_url, json=payload, headers=headers)
        if resp.status_code != 200:
            raise BhashiniError(f"Pipeline config call failed: {resp.status_code} {resp.text}")
        data = resp.json()

        cfg = data["pipelineResponseConfig"]
        self._service_ids["asr"] = cfg[0]["config"][0]["serviceId"]
        self._service_ids["translation"] = cfg[1]["config"][0]["serviceId"]
        self._service_ids["tts"] = cfg[2]["config"][0]["serviceId"]

        auth = data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]
        self._compute_endpoint = data["pipelineInferenceAPIEndPoint"]["callbackUrl"]
        self._compute_auth_header = {auth["name"]: auth["value"]}

    def _ensure_config(self, source_lang: str, target_lang: str = "en"):
        if not self._compute_endpoint:
            self._load_pipeline_config(source_lang, target_lang)

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=6))
    def speech_to_text(self, audio_base64: str, source_lang: str,
                        audio_format: str = "wav", sampling_rate: int = 8000) -> str:
        """ASR: phone audio (base64) -> text in the caller's language.
        Twilio call recordings are 8kHz mono mu-law/wav by default."""
        lang = LANG_MAP.get(source_lang, source_lang.split("-")[0])
        self._ensure_config(lang)
        payload = {
            "pipelineTasks": [{
                "taskType": "asr",
                "config": {
                    "language": {"sourceLanguage": lang},
                    "serviceId": self._service_ids["asr"],
                    "audioFormat": audio_format,
                    "samplingRate": sampling_rate,
                },
            }],
            "inputData": {"audio": [{"audioContent": audio_base64}]},
        }
        return self._compute(payload)

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=6))
    def translate(self, text: str, source_lang: str, target_lang: str = "en-IN") -> str:
        src = LANG_MAP.get(source_lang, source_lang.split("-")[0])
        tgt = LANG_MAP.get(target_lang, target_lang.split("-")[0])
        self._ensure_config(src, tgt)
        if src == tgt:
            return text
        payload = {
            "pipelineTasks": [{
                "taskType": "translation",
                "config": {
                    "language": {"sourceLanguage": src, "targetLanguage": tgt},
                    "serviceId": self._service_ids["translation"],
                },
            }],
            "inputData": {"input": [{"source": text}]},
        }
        return self._compute(payload)

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=6))
    def text_to_speech(self, text: str, target_lang: str, gender: str = "female") -> str:
        """Returns base64-encoded audio content (wav)."""
        lang = LANG_MAP.get(target_lang, target_lang.split("-")[0])
        self._ensure_config(lang)
        payload = {
            "pipelineTasks": [{
                "taskType": "tts",
                "config": {
                    "language": {"sourceLanguage": lang},
                    "serviceId": self._service_ids["tts"],
                    "gender": gender,
                },
            }],
            "inputData": {"input": [{"source": text}]},
        }
        return self._compute(payload, expect_audio=True)

    def _compute(self, payload: dict, expect_audio: bool = False) -> str:
        if not self._compute_endpoint:
            raise BhashiniError("Pipeline not configured — call _ensure_config first")
        headers = {**self._compute_auth_header, "Content-Type": "application/json"}
        with httpx.Client(timeout=20) as client:
            resp = client.post(self._compute_endpoint, json=payload, headers=headers)
        if resp.status_code != 200:
            raise BhashiniError(f"Pipeline compute call failed: {resp.status_code} {resp.text}")
        data = resp.json()
        output = data["pipelineResponse"][0]["output"][0]
        return output["audioContent"] if expect_audio else output["source"]


@lru_cache
def get_bhashini_client() -> BhashiniClient:
    return BhashiniClient()
