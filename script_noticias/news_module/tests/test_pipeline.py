import json
from datetime import datetime, timezone
from types import SimpleNamespace

from app import pipeline, state
from app.models import NewsItem


def settings(tmp_path):
    return SimpleNamespace(data_dir=tmp_path, fetch_pdf_text=False, llm_api_key="", llm_model="", max_input_chars=60000)


def news():
    return NewsItem(id="n1", fonte="InfoMoney", secao="mercados", titulo="Titulo", resumo="Resumo", url="https://news", publicado_em=datetime(2026, 6, 15, 12, tzinfo=timezone.utc))


def test_run_dry_run_grava_payload_sem_marcar_seen(monkeypatch, tmp_path):
    config = settings(tmp_path)
    monkeypatch.setattr(pipeline, "load_settings", lambda: config)
    monkeypatch.setattr(pipeline, "fetch_news", lambda inicio, fim: [news()])
    monkeypatch.setattr(pipeline, "fetch_events", lambda inicio, fim: [])
    monkeypatch.setattr(state, "load_settings", lambda: config)
    now = datetime(2026, 6, 15, 12, tzinfo=timezone.utc)

    assert pipeline.run(now=now, dry_run=True) == 0
    output = tmp_path / "runs" / "2026-06-15" / "payload.json"
    assert json.loads(output.read_text())["noticias"][0]["id"] == "n1"
    assert state.filter_new([news()]) == [news()]


def test_run_sem_novidades_nao_chama_llm(monkeypatch, tmp_path):
    config = settings(tmp_path)
    monkeypatch.setattr(pipeline, "load_settings", lambda: config)
    monkeypatch.setattr(pipeline, "fetch_news", lambda inicio, fim: [])
    monkeypatch.setattr(pipeline, "fetch_events", lambda inicio, fim: [])
    monkeypatch.setattr(pipeline, "summarize", lambda *args: (_ for _ in ()).throw(AssertionError()))

    assert pipeline.run(now=datetime(2026, 6, 15, 12, tzinfo=timezone.utc)) == 0


def test_run_falha_llm_nao_marca_seen(monkeypatch, tmp_path):
    config = settings(tmp_path)
    monkeypatch.setattr(pipeline, "load_settings", lambda: config)
    monkeypatch.setattr(pipeline, "fetch_news", lambda inicio, fim: [news()])
    monkeypatch.setattr(pipeline, "fetch_events", lambda inicio, fim: [])
    monkeypatch.setattr(pipeline, "summarize", lambda *args: (_ for _ in ()).throw(RuntimeError("falha")))
    monkeypatch.setattr(state, "load_settings", lambda: config)

    assert pipeline.run(now=datetime(2026, 6, 15, 12, tzinfo=timezone.utc)) == 1
    assert state.filter_new([news()]) == [news()]
