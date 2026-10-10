import csv
import io
import logging
import time
import unicodedata
import zipfile
from datetime import date, datetime, time as datetime_time
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests

from app.config import load_settings
from app.models import CorporateEvent

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {
    "CNPJ_Companhia",
    "Nome_Companhia",
    "Codigo_CVM",
    "Data_Referencia",
    "Categoria",
    "Assunto",
    "Data_Entrega",
    "Protocolo_Entrega",
    "Versao",
    "Link_Download",
}


def _normalize(value: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFKD", value or "")
        if not unicodedata.combining(char)
    ).casefold().strip()


def _parse_date(value: str) -> date | None:
    value = (value or "").strip()
    if not value:
        return None
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%Y%m%d"):
        try:
            return datetime.strptime(value[:10], pattern).date()
        except ValueError:
            continue
    return None


def _parse_delivery(value: str, timezone_name: str) -> tuple[datetime, bool] | None:
    value = (value or "").strip()
    if not value:
        return None
    timezone = ZoneInfo(timezone_name)
    formats = ("%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%Y-%m-%dT%H:%M:%S")
    for pattern in formats:
        try:
            return datetime.strptime(value, pattern).replace(tzinfo=timezone), False
        except ValueError:
            continue
    parsed = _parse_date(value)
    if parsed is not None:
        return datetime.combine(parsed, datetime_time.min, tzinfo=timezone), True
    return None


def _download_year(year: int, settings) -> bytes:
    url = (
        "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/IPE/DADOS/"
        f"ipe_cia_aberta_{quote(str(year))}.zip"
    )
    for attempt in range(settings.http_retries + 1):
        try:
            response = requests.get(
                url,
                headers={"User-Agent": settings.user_agent},
                timeout=settings.http_timeout,
            )
            response.raise_for_status()
            return response.content
        except requests.RequestException:
            if attempt >= settings.http_retries:
                raise
            time.sleep(2**attempt)
    raise RuntimeError("falha ao baixar dataset da CVM")


def _read_zip(content: bytes) -> list[dict[str, str]]:
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if not csv_names:
            raise ValueError("dataset da CVM nao contem arquivo CSV")
        with archive.open(csv_names[0]) as csv_file:
            text = io.TextIOWrapper(csv_file, encoding="latin-1", newline="")
            reader = csv.DictReader(text, delimiter=";")
            columns = set(reader.fieldnames or [])
            missing = REQUIRED_COLUMNS - columns
            if missing:
                names = ", ".join(sorted(missing))
                raise ValueError(f"colunas obrigatorias ausentes no CSV da CVM: {names}")
            return list(reader)


def fetch_events(janela_inicio: datetime, janela_fim: datetime) -> list[CorporateEvent]:
    """Busca eventos IPE da CVM dentro da janela informada."""
    settings = load_settings()
    timezone_name = settings.timezone
    inicio = janela_inicio.astimezone(ZoneInfo(timezone_name))
    fim = janela_fim.astimezone(ZoneInfo(timezone_name))
    categories = {_normalize(item) for item in settings.cvm_categorias}
    years = {inicio.year, fim.year}
    events: dict[str, CorporateEvent] = {}

    for year in sorted(years):
        try:
            rows = _read_zip(_download_year(year, settings))
        except (requests.RequestException, OSError, zipfile.BadZipFile, ValueError) as error:
            logger.warning("falha ao ler dataset IPE de %s: %s", year, error)
            continue

        for row in rows:
            if _normalize(row.get("Categoria", "")) not in categories:
                continue
            delivery = _parse_delivery(row.get("Data_Entrega", ""), timezone_name)
            if delivery is None:
                continue
            delivered_at, date_only = delivery
            if date_only:
                if not inicio.date() <= delivered_at.date() <= fim.date():
                    continue
            elif not inicio <= delivered_at <= fim:
                continue
            event_id = f"{row['Protocolo_Entrega'].strip()}-{row['Versao'].strip()}"
            reference_date = _parse_date(row.get("Data_Referencia", ""))
            events[event_id] = CorporateEvent(
                id=event_id,
                cnpj=row.get("CNPJ_Companhia", "").strip(),
                empresa=row.get("Nome_Companhia", "").strip(),
                codigo_cvm=row.get("Codigo_CVM", "").strip() or None,
                categoria=row.get("Categoria", "").strip(),
                assunto=row.get("Assunto", "").strip() or None,
                entregue_em=delivered_at,
                data_referencia=reference_date,
                link_documento=row.get("Link_Download", "").strip(),
                texto_status="nao_tentado",
            )

    return sorted(events.values(), key=lambda event: event.entregue_em, reverse=True)
