from abc import ABC, abstractmethod
import time

import requests

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"


class LLMClient(ABC):
    @abstractmethod
    def generate(self, system: str, user: str) -> str:
        raise NotImplementedError


class FakeLLMClient(LLMClient):
    def __init__(self, responses: list[str]):
        self.responses = list(responses)
        self.calls: list[tuple[str, str]] = []

    def generate(self, system: str, user: str) -> str:
        self.calls.append((system, user))
        if not self.responses:
            raise RuntimeError("FakeLLMClient sem respostas")
        return self.responses.pop(0)


class OpenAICompatibleClient(LLMClient):
    def __init__(self, api_key: str, model: str, endpoint: str = GROQ_ENDPOINT, retries: int = 3, timeout: int = 60):
        self.api_key = api_key
        self.model = model
        self.endpoint = endpoint
        self.retries = retries
        self.timeout = timeout

    def generate(self, system: str, user: str) -> str:
        for attempt in range(self.retries + 1):
            try:
                response = requests.post(
                    self.endpoint,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                        "temperature": 0,
                        "response_format": {"type": "json_object"},
                    },
                    timeout=self.timeout,
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
            except requests.RequestException:
                if attempt >= self.retries:
                    raise
                time.sleep(2**attempt)
        raise RuntimeError("falha ao chamar LLM")


def create_client(settings) -> LLMClient:
    if not settings.llm_api_key:
        raise ValueError("LLM_API_KEY e obrigatoria")
    return OpenAICompatibleClient(
        settings.llm_api_key,
        settings.llm_model,
        GROQ_ENDPOINT,
        getattr(settings, "http_retries", 3),
        getattr(settings, "http_timeout", 60),
    )
