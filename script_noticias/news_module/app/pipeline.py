import json
import logging
from datetime import datetime
from pathlib import Path

from app import state
from app.config import load_settings
from app.llm.client import create_client
from app.llm.summarizer import summarize
from app.models import IngestionPayload
from app.render import render_markdown
from app.sources.cvm_ipe import fetch_events
from app.sources.infomoney_rss import fetch_news
from app.sources.pdf_text import enrich_with_pdf_text
from app.window import get_window


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(
            {
                "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
                "level": record.levelname,
                "message": record.getMessage(),
            },
            ensure_ascii=False,
        )


def _write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def run(now: datetime | None = None, window_hours: int = 24, dry_run: bool = False, skip_llm: bool = False) -> int:
    settings = load_settings()
    inicio, fim = get_window(now=now, hours=window_hours)
    run_dir = settings.data_dir / "runs" / fim.date().isoformat()
    run_dir.mkdir(parents=True, exist_ok=True)
    log_path = run_dir / "run.log"
    logging.basicConfig(filename=log_path, level=logging.INFO, force=True)
    for handler in logging.getLogger().handlers:
        handler.setFormatter(_JsonFormatter())
    logger = logging.getLogger(__name__)

    source_failures = 0
    try:
        news = fetch_news(inicio, fim)
        source_failures += getattr(news, "failed_feeds", 0)
    except Exception as error:
        logger.exception("falha na fonte InfoMoney: %s", error)
        news = []
        source_failures += 1
    try:
        events = fetch_events(inicio, fim)
        source_failures += getattr(events, "failed_years", 0)
    except Exception as error:
        logger.exception("falha na fonte CVM: %s", error)
        events = []
        source_failures += 1

    logger.info("fontes: noticias=%s eventos=%s falhas=%s", len(news), len(events), source_failures)
    candidates = state.filter_new([*news, *events])
    logger.info(
        "itens: na_janela=%s novos=%s descartados=%s",
        len(news) + len(events),
        len(candidates),
        len(news) + len(events) - len(candidates),
    )
    new_news = [item for item in candidates if item in news]
    new_events = [item for item in candidates if item in events]
    if settings.fetch_pdf_text and new_events:
        new_events = enrich_with_pdf_text(new_events)
    payload = IngestionPayload(gerado_em=fim, janela_inicio=inicio, janela_fim=fim, noticias=new_news, eventos=new_events)
    _write_json(run_dir / "payload.json", payload.model_dump(mode="json"))

    if not candidates:
        logger.info("sem novidades")
        return 1 if source_failures >= 2 else 2 if source_failures else 0
    if dry_run or skip_llm:
        logger.info("execucao sem LLM: %s noticias, %s eventos", len(new_news), len(new_events))
        return 0 if source_failures == 0 else 2

    try:
        client = create_client(settings)
        digest = summarize(payload, client, settings.max_input_chars)
        _write_json(run_dir / "digest.json", digest.model_dump(mode="json"))
        (run_dir / "digest.md").write_text(render_markdown(digest), encoding="utf-8")
        state.mark_seen(candidates)
    except Exception as error:
        logger.exception("falha ao gerar digest: %s", error)
        return 1
    return 0 if source_failures == 0 else 2
