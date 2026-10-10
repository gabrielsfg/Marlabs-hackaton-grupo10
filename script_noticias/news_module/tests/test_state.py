import sqlite3
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.models import CorporateEvent, NewsItem
from app import state


def settings(tmp_path):
    return SimpleNamespace(data_dir=tmp_path)


def news(item_id="news-1"):
    return NewsItem(
        id=item_id,
        fonte="InfoMoney",
        secao="mercados",
        titulo="Titulo",
        resumo="Resumo",
        url="https://example.test/news",
        publicado_em=datetime(2026, 6, 15, tzinfo=timezone.utc),
    )


def event(item_id="event-1"):
    return CorporateEvent(
        id=item_id,
        cnpj="00000000000191",
        empresa="Empresa",
        categoria="Fato Relevante",
        entregue_em=datetime(2026, 6, 15, tzinfo=timezone.utc),
        link_documento="https://example.test/document.pdf",
    )


def test_filter_new_e_mark_seen_sao_idempotentes(monkeypatch, tmp_path):
    monkeypatch.setattr(state, "load_settings", lambda: settings(tmp_path))
    items = [news(), event()]

    assert state.filter_new(items) == items
    state.mark_seen(items)

    assert state.filter_new(items) == []
    assert (tmp_path / "state" / "seen.db").exists()


def test_mark_seen_preserva_tipo_no_banco(monkeypatch, tmp_path):
    monkeypatch.setattr(state, "load_settings", lambda: settings(tmp_path))
    state.mark_seen([news(), event()])

    with sqlite3.connect(tmp_path / "state" / "seen.db") as connection:
        rows = connection.execute("SELECT id, tipo FROM seen ORDER BY id").fetchall()

    assert rows == [("event-1", "evento_corporativo"), ("news-1", "noticia")]


def test_filter_new_nao_altera_a_lista_recebida(monkeypatch, tmp_path):
    monkeypatch.setattr(state, "load_settings", lambda: settings(tmp_path))
    items = [news(), event()]
    state.mark_seen([items[0]])

    assert state.filter_new(items) == [items[1]]
    assert items == [items[0], items[1]]


def test_prune_remove_apenas_registros_antigos(monkeypatch, tmp_path):
    monkeypatch.setattr(state, "load_settings", lambda: settings(tmp_path))
    state.mark_seen([news("old"), news("recent")])
    old_timestamp = (datetime.now(timezone.utc) - timedelta(days=31)).isoformat()
    with sqlite3.connect(tmp_path / "state" / "seen.db") as connection:
        connection.execute("UPDATE seen SET visto_em = ? WHERE id = ?", (old_timestamp, "old"))
        connection.commit()

    assert state.prune(dias=30) == 1
    assert state.filter_new([news("old"), news("recent")]) == [news("old")]


def test_itens_podem_ser_reprocessados_ate_mark_seen(monkeypatch, tmp_path):
    monkeypatch.setattr(state, "load_settings", lambda: settings(tmp_path))
    items = [news()]

    first_attempt = state.filter_new(items)
    assert first_attempt == items
    # A falha posterior, como erro do LLM, nao deixa o item marcado.
    assert state.filter_new(items) == items

    state.mark_seen(items)
    assert state.filter_new(items) == []
