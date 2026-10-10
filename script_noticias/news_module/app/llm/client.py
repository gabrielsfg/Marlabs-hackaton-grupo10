import json
from abc import ABC, abstractmethod

import requests


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
    def __init__(self, api_key: str, model: str, endpoint: str = "https://api.openai.com/v1/chat/completions"):
        self.api_key = api_key
        self.model = model
        self.endpoint = endpoint

    def generate(self, system: str, user: str) -> str:
        response = requests.post(
            self.endpoint,
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "temperature": 0,
                "response_format": {"type": "json_object"},
            },
            timeout=60,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
