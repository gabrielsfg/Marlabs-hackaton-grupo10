import csv
import io
import zipfile
from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app.sources import cvm_ipe


def make_zip(rows, columns=None):
    columns = columns or [
        "CNPJ_Companhia", "Nome_Companhia", "Codigo_CVM", "Data_Referencia",
        "Categoria", "Tipo", "Especie", "Assunto", "Data_Entrega",
        "Tipo_Apresentacao", "Protocolo_Entrega", "Versao", "Link_Download",
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, delimiter=";", extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w") as zipped:
        zipped.writestr("ipe_cia_aberta.csv", output.getvalue().encode("latin-1"))
    return archive.getvalue()


def row(**values):
    base = {
        "CNPJ_Companhia": "00.000.000/0001-91",
        "Nome_Companhia": "Companhia Teste",
        "Codigo_CVM": "12345",
        "Data_Referencia": "2026-06-15",
        "Categoria": "Fato Relevante",
        "Tipo": "",
        "Especie": "",
        "Assunto": "Resultado",
        "Data_Entrega": "2026-06-15 10:30:00",
        "Tipo_Apresentacao": "",
        "Protocolo_Entrega": "100",
        "Versao": "1",
        "Link_Download": "https://cvm.test/doc.pdf",
    }
    base.update(values)
    return base


def settings(feeds):
    return SimpleNamespace(
        timezone="America/Sao_Paulo",
        cvm_categorias=["Fato Relevante", "Comunicado ao Mercado"],
        http_timeout=30,
        http_retries=0,
        user_agent="test-agent",
    )


def test_fetch_events_filtra_categoria_data_e_versao(monkeypatch):
    content = make_zip([
        row(),
        row(Categoria="Aviso aos Acionistas", Protocolo_Entrega="101"),
        row(Data_Entrega="2026-06-14 10:30:00", Protocolo_Entrega="102"),
        row(Versao="2"),
    ])
    monkeypatch.setattr(cvm_ipe, "load_settings", lambda: settings([]))
    monkeypatch.setattr(cvm_ipe, "_download_year", lambda year, config: content)
    inicio = datetime(2026, 6, 15, 0, 0, tzinfo=ZoneInfo("America/Sao_Paulo"))
    fim = datetime(2026, 6, 15, 23, 59, tzinfo=ZoneInfo("America/Sao_Paulo"))

    events = cvm_ipe.fetch_events(inicio, fim)

    assert {event.id for event in events} == {"100-1", "100-2"}
    assert events[0].empresa == "Companhia Teste"
    assert events[0].codigo_cvm == "12345"
    assert events[0].texto_status == "nao_tentado"


def test_fetch_events_cobre_virada_de_ano(monkeypatch):
    downloaded_years = []
    contents = {
        2025: make_zip([row(Data_Entrega="2025-12-31", Protocolo_Entrega="25")]),
        2026: make_zip([row(Data_Entrega="2026-01-01", Protocolo_Entrega="26")]),
    }
    monkeypatch.setattr(cvm_ipe, "load_settings", lambda: settings([]))

    def download(year, config):
        downloaded_years.append(year)
        return contents[year]

    monkeypatch.setattr(cvm_ipe, "_download_year", download)
    inicio = datetime(2025, 12, 31, 0, 0, tzinfo=ZoneInfo("America/Sao_Paulo"))
    fim = datetime(2026, 1, 1, 23, 59, tzinfo=ZoneInfo("America/Sao_Paulo"))

    events = cvm_ipe.fetch_events(inicio, fim)

    assert downloaded_years == [2025, 2026]
    assert {event.id for event in events} == {"25-1", "26-1"}


def test_fetch_events_falha_com_coluna_ausente(monkeypatch):
    columns = ["CNPJ_Companhia", "Nome_Companhia"]
    content = make_zip([row()], columns=columns)
    monkeypatch.setattr(cvm_ipe, "load_settings", lambda: settings([]))
    monkeypatch.setattr(cvm_ipe, "_download_year", lambda year, config: content)
    inicio = datetime(2026, 6, 15, 0, 0, tzinfo=ZoneInfo("America/Sao_Paulo"))
    fim = datetime(2026, 6, 15, 23, 59, tzinfo=ZoneInfo("America/Sao_Paulo"))

    assert cvm_ipe.fetch_events(inicio, fim) == []


def test_fetch_events_nao_interrompe_com_ano_indisponivel(monkeypatch):
    content = make_zip([row(Data_Entrega="2026-01-01")])
    monkeypatch.setattr(cvm_ipe, "load_settings", lambda: settings([]))

    def download(year, config):
        if year == 2025:
            raise cvm_ipe.requests.RequestException("offline")
        return content

    monkeypatch.setattr(cvm_ipe, "_download_year", download)
    inicio = datetime(2025, 12, 31, 0, 0, tzinfo=ZoneInfo("America/Sao_Paulo"))
    fim = datetime(2026, 1, 1, 23, 59, tzinfo=ZoneInfo("America/Sao_Paulo"))

    events = cvm_ipe.fetch_events(inicio, fim)

    assert len(events) == 1
