import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_INFOMONEY_FEEDS = [
    "https://www.infomoney.com.br/mercados/feed/",
    "https://www.infomoney.com.br/economia/feed/",
    "https://www.infomoney.com.br/business/feed/",
]

DEFAULT_CVM_CATEGORIAS = [
    "Fato Relevante",
    "Comunicado ao Mercado",
    "Aviso aos Debenturistas",
    "Aviso aos Acionistas",
]

DEFAULT_LLM_MODEL = "openai/gpt-oss-20b"

_ENV_LOADED = False


def _parse_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def load_dotenv() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    root = Path(__file__).resolve().parent.parent
    _parse_env_file(Path.cwd() / ".env")
    _parse_env_file(root / ".env")
    _ENV_LOADED = True


def _split_list(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _as_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "sim"}


@dataclass(frozen=True)
class Settings:
    timezone: str
    window_hours: int
    infomoney_feeds: list[str]
    cvm_categorias: list[str]
    http_timeout: int
    http_retries: int
    user_agent: str
    fetch_pdf_text: bool
    pdf_max_chars: int
    pdf_max_bytes: int
    llm_api_key: str
    llm_model: str
    max_input_chars: int
    data_dir: Path


def load_settings() -> Settings:
    load_dotenv()
    feeds = os.environ.get("INFOMONEY_FEEDS")
    categorias = os.environ.get("CVM_CATEGORIAS")
    return Settings(
        timezone=os.environ.get("TIMEZONE", "America/Sao_Paulo"),
        window_hours=int(os.environ.get("WINDOW_HOURS", "24")),
        infomoney_feeds=_split_list(feeds) if feeds else list(DEFAULT_INFOMONEY_FEEDS),
        cvm_categorias=_split_list(categorias) if categorias else list(DEFAULT_CVM_CATEGORIAS),
        http_timeout=int(os.environ.get("HTTP_TIMEOUT", "30")),
        http_retries=int(os.environ.get("HTTP_RETRIES", "3")),
        user_agent=os.environ.get(
            "USER_AGENT",
            "HackatonAssessor/1.0 (news-ingestion)",
        ),
        fetch_pdf_text=_as_bool(os.environ.get("FETCH_PDF_TEXT", "true")),
        pdf_max_chars=int(os.environ.get("PDF_MAX_CHARS", "6000")),
        pdf_max_bytes=int(os.environ.get("PDF_MAX_BYTES", "10000000")),
        llm_api_key=os.environ.get("LLM_API_KEY", ""),
        llm_model=os.environ.get("LLM_MODEL") or DEFAULT_LLM_MODEL,
        max_input_chars=int(os.environ.get("MAX_INPUT_CHARS", "60000")),
        data_dir=Path(os.environ.get("DATA_DIR", "./data")),
    )
