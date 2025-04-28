"""
custom_llm.py
Custom LangChain LLM wrapper for a locally-hosted Llama-based FastAPI service.
"""

import os
from typing import Any, List, Mapping, Optional

import requests
from langchain.llms.base import LLM
from nemoguardrails.llm.providers import register_llm_provider


class CustomLLM(LLM):
    # ------------------------------------------------------------------ #
    # ❶  Configuration defaults – all can be overridden with env vars    #
    # ------------------------------------------------------------------ #
    api_url: str = os.getenv("LLAMA_API_URL", "http://llama-api:8000/generate")
    temperature: float = float(os.getenv("TEMPERATURE", 0.7))
    max_tokens: int = int(os.getenv("MAX_TOKENS", 512))
    top_p: float = float(os.getenv("TOP_P", 0.95))

    # Per-request timeout (seconds)
    request_timeout: int = int(os.getenv("TIMEOUT", 360))  # <-- raise as needed

    # ------------------------------------------------------------------ #
    # ❷  LangChain required properties                                   #
    # ------------------------------------------------------------------ #
    @property
    def _llm_type(self) -> str:
        return "custom_llama"

    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Parameters that uniquely identify this LLM."""
        return {
            "api_url": self.api_url,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "timeout": self.request_timeout,
        }

    # ------------------------------------------------------------------ #
    # ❸  Core call                                                       #
    # ------------------------------------------------------------------ #
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager=None,
        **kwargs,
    ) -> str:
        """Call the local Llama API and return the model output."""

        # Allow per-request overrides via **kwargs
        temperature = kwargs.get("temperature", self.temperature)
        max_tokens = kwargs.get("max_tokens", self.max_tokens)
        top_p = kwargs.get("top_p", self.top_p)
        timeout = kwargs.get("timeout", self.request_timeout)

        # FastAPI endpoint might expect list[string] for stop
        stop = stop or ["User:", "Assistant:", "Q:"]
        payload = {
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
            "stop": stop,
        }

        try:
            r = requests.post(self.api_url, json=payload, timeout=timeout)
            r.raise_for_status()  # raises HTTPError for non-2xx
        except requests.exceptions.Timeout as e:
            raise RuntimeError(
                f"Llama API timed out after {timeout}s. "
                "Increase TIMEOUT env var if your model needs more time."
            ) from e
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Llama API call failed: {e}") from e

        # Expecting JSON: { "response": "..." }
        raw_text = r.json().get("response", "")
        if not raw_text:
            raise ValueError(
                f"Malformed response from Llama API: {r.text[:200]}..."
            )

        # ------------------------------------------------------------------ #
        # ❹  Light post-processing – strip the echoed prompt / role labels    #
        # ------------------------------------------------------------------ #
        # Remove leading prompt echo if server returns it
        if raw_text.startswith(prompt):
            raw_text = raw_text[len(prompt) :]

        # If the model includes role labels, keep only assistant chunk
        for label in ("Assistant:", "assistant:", "### Assistant:", "User:"):
            if label in raw_text:
                raw_text = raw_text.split(label, 1)[-1]

        return raw_text.strip()


# ---------------------------------------------------------------------- #
# ❺  Make the provider name `custom` visible to NeMo Guardrails          #
# ---------------------------------------------------------------------- #
register_llm_provider("custom", CustomLLM)
