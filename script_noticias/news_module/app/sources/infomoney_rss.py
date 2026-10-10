import hashlib
import logging
import re
import time
import calendar
from datetime import datetime, timezone
from time import struct_time
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

import feedparser
import requests
from bs4 import BeautifulSoup

from app.config import load_settings
from app.models import NewsItem

logger = logging.getLogger(__name__)


class NewsFetchResult(list):
    def __init__(self, items=(), failed_feeds: int = 0):
        super().__init__(items)
        self.failed_feeds = failed_feeds


def _canonical_url(url: str) -> str:
    parsed = urlsplit(url.strip())
    query = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.lower().startswith("utm_")
    ]
    path = parsed.path.rstrip("/") or "/"
    return urlunsplit((parsed.scheme, parsed.netloc, path, urlencode(query), ""))


def _clean_summary(value: str) -> str:
    text = BeautifulSoup(value or "", "html.parser").get_text(" ")
    text = re.sub(r"\s+", " ", text).strip()
    return re.sub(r"\s+([.,!?;:])", r"\1", text)


def _published_datetime(value: struct_time | None, timezone_name: str) -> datetime | None:
    if value is None:
        return None
    utc_value = datetime.fromtimestamp(calendar.timegm(value), timezone.utc)
    return utc_value.astimezone(ZoneInfo(timezone_name))


def _section(feed_url: str) -> str:
    parts = [part for part in urlsplit(feed_url).path.split("/") if part]
    return parts[0] if parts else "geral"


def _fetch_feed(url: str, timeout: int, retries: int, user_agent: str) -> bytes:
    headers = {"User-Agent": user_agent}
    for attempt in range(retries + 1):
        try:
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()
            return response.content
        except requests.RequestException:
            if attempt >= retries:
                raise
            time.sleep(2**attempt)
    raise RuntimeError("falha ao baixar feed")


def fetch_news(janela_inicio: datetime, janela_fim: datetime) -> list[NewsItem]:
    """Busca e normaliza noticias do RSS do InfoMoney dentro da janela."""
    settings = load_settings()
    timezone_name = settings.timezone
    inicio = janela_inicio.astimezone(ZoneInfo(timezone_name))
    fim = janela_fim.astimezone(ZoneInfo(timezone_name))
    items: dict[str, NewsItem] = {}
    failed_feeds = 0

    for feed_url in settings.infomoney_feeds:
        try:
            content = _fetch_feed(
                feed_url,
                settings.http_timeout,
                settings.http_retries,
                settings.user_agent,
            )
            parsed = feedparser.parse(content)
        except (requests.RequestException, OSError) as error:
            logger.warning("falha ao buscar feed %s: %s", feed_url, error)
            failed_feeds += 1
            continue

        for entry in parsed.entries:
            published = _published_datetime(
                getattr(entry, "published_parsed", None), timezone_name
            )
            if published is None:
                logger.warning("entrada sem data descartada no feed %s", feed_url)
                continue
            if not inicio <= published <= fim:
                continue

            raw_url = str(getattr(entry, "link", "")).strip()
            if not raw_url:
                continue
            url = _canonical_url(raw_url)
            item_id = hashlib.sha256(url.encode("utf-8")).hexdigest()
            item = NewsItem(
                id=item_id,
                fonte="InfoMoney",
                secao=_section(feed_url),
                titulo=str(getattr(entry, "title", "")).strip(),
                resumo=_clean_summary(getattr(entry, "summary", "")),
                url=url,
                publicado_em=published,
            )
            if item_id not in items:
                items[item_id] = item

    return NewsFetchResult(
        sorted(items.values(), key=lambda item: item.publicado_em, reverse=True),
        failed_feeds,
    )
