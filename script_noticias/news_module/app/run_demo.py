import argparse
import io
import json
import logging
import re
import time
import unicodedata
from datetime import datetime
from pathlib import Path
from textwrap import wrap

import pypdf
import requests

from app.config import load_settings
from app.llm.client import LLMClient, create_client
from app.llm.summarizer import summarize
from app.models import CorporateEvent, IngestionPayload
from app.sources.cvm_ipe import fetch_events
from app.window import get_window

DEMO_SCHEMA_INSTRUCTIONS = """
Responda somente com um objeto JSON valido, sem Markdown e sem campos adicionais.
O objeto raiz deve ter exatamente estas chaves:
data_referencia (YYYY-MM-DD), resumo_executivo (string), itens (array) e avisos (array de strings).
Cada item deve ter exatamente estas chaves:
tipo, titulo, resumo, relevancia, classe_ativo, entidades_citadas e fonte_url.
tipo deve ser "evento_corporativo"; relevancia deve ser "alta", "media" ou "baixa";
classe_ativo deve ser "renda_variavel", "renda_fixa", "macro" ou "misto".
Use resumo, nunca texto; use fonte_url, nunca url; nao inclua empresa, data ou texto como campos do item.
"""


class _DemoPromptClient(LLMClient):
    def __init__(self, client: LLMClient):
        self.client = client

    def generate(self, system: str, user: str) -> str:
        return self.client.generate(system, user + "\n" + DEMO_SCHEMA_INSTRUCTIONS)


def _normalize(value: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFKD", value or "")
        if not unicodedata.combining(char)
    ).casefold().strip()


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _digest_lines(digest) -> list[str]:
    lines = [
        f"Resumo de investimentos - {digest.data_referencia}",
        "",
        "Resumo executivo",
        *wrap(digest.resumo_executivo, width=92),
        "",
        "Eventos corporativos",
    ]
    for item in digest.itens:
        if item.tipo != "evento_corporativo":
            continue
        lines.extend([
            "",
            item.titulo,
            f"Relevancia: {item.relevancia} | Classe: {item.classe_ativo}",
            *wrap(item.resumo, width=92),
            f"Entidades: {', '.join(item.entidades_citadas) or 'Nenhuma'}",
            f"Fonte: {item.fonte_url}",
        ])
    if digest.avisos:
        lines.extend(["", "Avisos", *[f"- {warning}" for warning in digest.avisos]])
    return lines


def _write_digest_text(path: Path, digest) -> None:
    path.write_text("\n".join(_digest_lines(digest)) + "\n", encoding="utf-8")


def _download_and_extract(event: CorporateEvent, output_path: Path, settings) -> CorporateEvent:
    response = None
    for attempt in range(settings.http_retries + 1):
        try:
            response = requests.get(
                event.link_documento,
                headers={"User-Agent": settings.user_agent},
                timeout=settings.http_timeout,
            )
            response.raise_for_status()
            break
        except requests.RequestException:
            if attempt >= settings.http_retries:
                raise
            time.sleep(2**attempt)

    content = response.content
    content_type = response.headers.get("Content-Type", "").lower()
    if len(content) > settings.pdf_max_bytes:
        raise ValueError("PDF excede PDF_MAX_BYTES")
    if "pdf" not in content_type and not content.startswith(b"%PDF"):
        raise ValueError("link nao retornou um PDF")

    output_path.write_bytes(content)
    reader = pypdf.PdfReader(io.BytesIO(content))
    text = _clean_text(" ".join(page.extract_text() or "" for page in reader.pages))
    if not text:
        raise ValueError("PDF sem texto extraivel")
    return event.model_copy(update={
        "texto_documento": text[: settings.pdf_max_chars],
        "texto_status": "ok",
    })


def _enrich_events(events: list[CorporateEvent], pdf_dir: Path, settings, logger) -> list[CorporateEvent]:
    enriched = []
    for index, event in enumerate(events, 1):
        filename = f"{index:02d}_{event.id}.pdf"
        try:
            enriched.append(_download_and_extract(event, pdf_dir / filename, settings))
            logger.info("PDF salvo: %s", filename)
        except Exception as error:
            logger.warning("falha no PDF %s: %s", event.id, error)
            enriched.append(event.model_copy(update={"texto_documento": None, "texto_status": "falha"}))
    return enriched


def run_demo(now: datetime | None = None, days: int = 30, limit: int = 3) -> int:
    settings = load_settings()
    inicio, fim = get_window(now=now, hours=days * 24)
    output_dir = settings.data_dir / "demo" / fim.date().isoformat()
    pdf_dir = output_dir / "pdfs"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_dir.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(filename=output_dir / "run.log", level=logging.INFO, force=True)
    logger = logging.getLogger(__name__)

    events = fetch_events(inicio, fim)
    relevant = [event for event in events if _normalize(event.categoria) == "fato relevante"]
    selected = sorted(relevant, key=lambda event: event.entregue_em, reverse=True)[:limit]
    if not selected:
        logger.warning("nenhum Fato Relevante encontrado na janela")
        return 1

    enriched = _enrich_events(selected, pdf_dir, settings, logger)
    payload = IngestionPayload(
        gerado_em=fim,
        janela_inicio=inicio,
        janela_fim=fim,
        noticias=[],
        eventos=enriched,
    )
    (output_dir / "payload.json").write_text(
        json.dumps(payload.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    client = _DemoPromptClient(create_client(settings))
    digest = summarize(payload, client, settings.max_input_chars)
    digest = digest.model_copy(update={
        "itens": [item for item in digest.itens if item.tipo == "evento_corporativo"],
    })
    (output_dir / "digest.json").write_text(
        json.dumps(digest.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    _write_digest_text(output_dir / "digest.txt", digest)
    old_markdown = output_dir / "digest.md"
    if old_markdown.exists():
        old_markdown.unlink()
    old_pdf = output_dir / "digest.pdf"
    if old_pdf.exists():
        old_pdf.unlink()
    logger.info("demo concluida: %s eventos selecionados", len(enriched))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera demonstracao com tres Fatos Relevantes da CVM")
    parser.add_argument("--now", help="Horario final da janela em ISO 8601")
    parser.add_argument("--days", type=int, default=30, help="Quantidade de dias da janela")
    args = parser.parse_args()
    now = datetime.fromisoformat(args.now) if args.now else None
    return run_demo(now=now, days=args.days)


if __name__ == "__main__":
    raise SystemExit(main())
