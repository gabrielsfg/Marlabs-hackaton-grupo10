from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.llm.client import OpenAICompatibleClient, create_client
from app.sources import infomoney_rss, pdf_text


def test_create_client_usa_groq_e_endpoint_fixo():
    settings = SimpleNamespace(
        llm_api_key="secret",
        llm_model="model",
    )
    client = create_client(settings)
    assert isinstance(client, OpenAICompatibleClient)
    assert client.endpoint == "https://api.groq.com/openai/v1/chat/completions"


def test_create_client_exige_chave():
    settings = SimpleNamespace(llm_api_key="", llm_model="model")
    with pytest.raises(ValueError, match="obrigatoria"):
        create_client(settings)


def test_pdf_retrya_falha_http(monkeypatch):
    attempts = []
    settings = SimpleNamespace(
        fetch_pdf_text=True,
        http_timeout=30,
        http_retries=1,
        user_agent="test",
        pdf_max_bytes=10000,
        pdf_max_chars=100,
    )

    class Response:
        headers = {"Content-Type": "text/html"}
        content = b"not pdf"

        def raise_for_status(self):
            if len(attempts) == 1:
                raise pdf_text.requests.RequestException("temporary")

    monkeypatch.setattr(
        pdf_text.requests,
        "get",
        lambda *args, **kwargs: (attempts.append(1) or Response()),
    )
    from app.models import CorporateEvent
    item = CorporateEvent(
        id="e-1", cnpj="1", empresa="Empresa", categoria="Fato Relevante",
        entregue_em=datetime(2026, 1, 1, tzinfo=timezone.utc), link_documento="https://pdf",
    )

    result = pdf_text._download_text(item, settings)
    assert len(attempts) == 2
    assert result.texto_status == "falha"


def test_infomoney_expõe_falha_de_feed(monkeypatch):
    settings = SimpleNamespace(
        timezone="America/Sao_Paulo",
        infomoney_feeds=["https://feed.test/a"],
        http_timeout=1,
        http_retries=0,
        user_agent="test",
    )
    monkeypatch.setattr(infomoney_rss, "load_settings", lambda: settings)
    monkeypatch.setattr(
        infomoney_rss.requests,
        "get",
        lambda *args, **kwargs: (_ for _ in ()).throw(infomoney_rss.requests.RequestException("offline")),
    )
    result = infomoney_rss.fetch_news(
        datetime(2026, 1, 1, tzinfo=timezone.utc),
        datetime(2026, 1, 2, tzinfo=timezone.utc),
    )
    assert result == []
    assert result.failed_feeds == 1
