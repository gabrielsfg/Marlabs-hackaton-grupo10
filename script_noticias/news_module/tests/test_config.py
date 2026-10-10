from app.config import load_settings


def test_load_settings_padroes(monkeypatch):
    for key in (
        "TIMEZONE",
        "WINDOW_HOURS",
        "INFOMONEY_FEEDS",
        "CVM_CATEGORIAS",
        "HTTP_TIMEOUT",
        "HTTP_RETRIES",
        "USER_AGENT",
        "FETCH_PDF_TEXT",
        "PDF_MAX_CHARS",
        "PDF_MAX_BYTES",
        "LLM_PROVIDER",
        "LLM_API_KEY",
        "LLM_MODEL",
        "MAX_INPUT_CHARS",
        "DATA_DIR",
    ):
        monkeypatch.delenv(key, raising=False)

    settings = load_settings()

    assert settings.timezone == "America/Sao_Paulo"
    assert settings.window_hours == 24
    assert settings.infomoney_feeds == [
        "https://www.infomoney.com.br/mercados/feed/",
        "https://www.infomoney.com.br/economia/feed/",
        "https://www.infomoney.com.br/business/feed/",
    ]
    assert settings.cvm_categorias == [
        "Fato Relevante",
        "Comunicado ao Mercado",
        "Aviso aos Debenturistas",
        "Aviso aos Acionistas",
    ]
    assert settings.http_timeout == 30
    assert settings.http_retries == 3
    assert "HackatonAssessor" in settings.user_agent
    assert settings.fetch_pdf_text is True
    assert settings.pdf_max_chars == 6000
    assert settings.pdf_max_bytes == 10_000_000
    assert settings.max_input_chars == 60_000
    assert str(settings.data_dir) == "data" or settings.data_dir.as_posix().endswith("data")


def test_load_settings_le_variaveis(monkeypatch):
    monkeypatch.setenv("WINDOW_HOURS", "12")
    monkeypatch.setenv("INFOMONEY_FEEDS", "https://exemplo/a/feed/, https://exemplo/b/feed/")
    monkeypatch.setenv("CVM_CATEGORIAS", "Fato Relevante, Comunicado ao Mercado")
    monkeypatch.setenv("FETCH_PDF_TEXT", "false")
    monkeypatch.setenv("HTTP_TIMEOUT", "10")
    monkeypatch.setenv("DATA_DIR", "/tmp/news-data")

    settings = load_settings()

    assert settings.window_hours == 12
    assert settings.infomoney_feeds == [
        "https://exemplo/a/feed/",
        "https://exemplo/b/feed/",
    ]
    assert settings.cvm_categorias == ["Fato Relevante", "Comunicado ao Mercado"]
    assert settings.fetch_pdf_text is False
    assert settings.http_timeout == 10
    assert settings.data_dir.as_posix() == "/tmp/news-data"
