from pathlib import Path


README = Path(__file__).parents[1] / "README.md"


def test_readme_documenta_instalacao_e_execucao():
    content = README.read_text(encoding="utf-8")
    assert "pip install -r requirements.txt" in content
    assert "python -m app.run_daily --dry-run" in content
    assert "python -m app.run_daily" in content


def test_readme_documenta_variaveis_e_saidas():
    content = README.read_text(encoding="utf-8")
    for variable in ("LLM_API_KEY", "DATA_DIR", "MAX_INPUT_CHARS", "FETCH_PDF_TEXT"):
        assert variable in content
    for output in ("payload.json", "digest.json", "digest.md", "run.log", "seen.db"):
        assert output in content


def test_readme_documenta_os_dois_agendadores():
    content = README.read_text(encoding="utf-8")
    assert "Agendamento com cron" in content
    assert "Agendamento com GitHub Actions" in content
    assert 'cron: "0 9 * * *"' in content
