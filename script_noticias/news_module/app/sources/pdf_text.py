import io
import logging
import re
from concurrent.futures import ThreadPoolExecutor

import pypdf
import requests

from app.config import load_settings
from app.models import CorporateEvent

logger = logging.getLogger(__name__)


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _download_text(event: CorporateEvent, settings) -> CorporateEvent:
    try:
        response = requests.get(
            event.link_documento,
            headers={"User-Agent": settings.user_agent},
            timeout=settings.http_timeout,
        )
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "").lower()
        content = response.content
        if "pdf" not in content_type or len(content) > settings.pdf_max_bytes:
            raise ValueError("resposta nao e um PDF valido ou excede o limite")

        reader = pypdf.PdfReader(io.BytesIO(content))
        text = _clean_text(" ".join(page.extract_text() or "" for page in reader.pages))
        if not text:
            raise ValueError("PDF sem texto extraivel")
        return event.model_copy(
            update={
                "texto_documento": text[: settings.pdf_max_chars],
                "texto_status": "ok",
            }
        )
    except (requests.RequestException, OSError, ValueError, pypdf.errors.PdfReadError) as error:
        logger.warning("falha ao extrair PDF do evento %s: %s", event.id, error)
        return event.model_copy(update={"texto_documento": None, "texto_status": "falha"})


def enrich_with_pdf_text(eventos: list[CorporateEvent]) -> list[CorporateEvent]:
    """Baixa e extrai texto dos PDFs sem interromper a ingestao por falhas."""
    settings = load_settings()
    if not settings.fetch_pdf_text:
        return list(eventos)
    with ThreadPoolExecutor(max_workers=4) as executor:
        return list(executor.map(lambda event: _download_text(event, settings), eventos))
