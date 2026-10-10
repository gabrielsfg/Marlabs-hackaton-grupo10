from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app.sources import infomoney_rss


class FakeResponse:
    def __init__(self, content: bytes, error: Exception | None = None):
        self.content = content
        self.error = error

    def raise_for_status(self):
        if self.error:
            raise self.error


RSS = b"""<?xml version="1.0"?><rss><channel>
<item><title>Mais recente</title><link>https://site.test/a/?utm_source=x&amp;ref=1#top</link>
<description>&lt;p&gt;Resumo &lt;b&gt;com HTML&lt;/b&gt;.&lt;/p&gt;</description>
<pubDate>Mon, 15 Jun 2026 15:00:00 GMT</pubDate></item>
<item><title>Duplicada</title><link>https://site.test/a/?utm_medium=y&amp;ref=1</link>
<description>Outro resumo</description><pubDate>Mon, 15 Jun 2026 14:00:00 GMT</pubDate></item>
<item><title>Fora da janela</title><link>https://site.test/old</link>
<description>Antiga</description><pubDate>Sun, 14 Jun 2026 10:00:00 GMT</pubDate></item>
<item><title>Sem data</title><link>https://site.test/no-date</link>
<description>Sem data</description></item>
</channel></rss>"""


def test_fetch_news_filtra_limpa_deduplica_e_converte_fuso(monkeypatch):
    settings = SimpleNamespace(
        timezone="America/Sao_Paulo",
        infomoney_feeds=["https://www.infomoney.com.br/mercados/feed/"],
        http_timeout=30,
        http_retries=0,
        user_agent="test-agent",
    )
    monkeypatch.setattr(infomoney_rss, "load_settings", lambda: settings)
    monkeypatch.setattr(
        infomoney_rss.requests,
        "get",
        lambda *args, **kwargs: FakeResponse(RSS),
    )
    inicio = datetime(2026, 6, 14, 12, 0, tzinfo=ZoneInfo("America/Sao_Paulo"))
    fim = datetime(2026, 6, 15, 12, 0, tzinfo=ZoneInfo("America/Sao_Paulo"))

    items = infomoney_rss.fetch_news(inicio, fim)

    assert len(items) == 1
    assert items[0].titulo == "Mais recente"
    assert items[0].resumo == "Resumo com HTML."
    assert items[0].publicado_em == fim
    assert items[0].url == "https://site.test/a?ref=1"
    assert items[0].secao == "mercados"


def test_fetch_news_feed_fora_do_ar_nao_levanta_excecao(monkeypatch):
    settings = SimpleNamespace(
        timezone="America/Sao_Paulo",
        infomoney_feeds=["https://site.test/feed/"],
        http_timeout=30,
        http_retries=0,
        user_agent="test-agent",
    )
    monkeypatch.setattr(infomoney_rss, "load_settings", lambda: settings)
    monkeypatch.setattr(
        infomoney_rss.requests,
        "get",
        lambda *args, **kwargs: FakeResponse(b"", ConnectionError("offline")),
    )

    items = infomoney_rss.fetch_news(
        datetime(2026, 6, 14, 12, 0, tzinfo=ZoneInfo("America/Sao_Paulo")),
        datetime(2026, 6, 15, 12, 0, tzinfo=ZoneInfo("America/Sao_Paulo")),
    )

    assert items == []


def test_fetch_news_continua_com_outro_feed_se_um_falhar(monkeypatch):
    settings = SimpleNamespace(
        timezone="America/Sao_Paulo",
        infomoney_feeds=["https://site.test/falha/", "https://site.test/mercados/feed/"],
        http_timeout=30,
        http_retries=0,
        user_agent="test-agent",
    )
    monkeypatch.setattr(infomoney_rss, "load_settings", lambda: settings)

    def get(url, **kwargs):
        if "falha" in url:
            return FakeResponse(b"", ConnectionError("offline"))
        return FakeResponse(RSS)

    monkeypatch.setattr(infomoney_rss.requests, "get", get)
    items = infomoney_rss.fetch_news(
        datetime(2026, 6, 14, 12, 0, tzinfo=ZoneInfo("America/Sao_Paulo")),
        datetime(2026, 6, 15, 12, 0, tzinfo=ZoneInfo("America/Sao_Paulo")),
    )

    assert len(items) == 1
