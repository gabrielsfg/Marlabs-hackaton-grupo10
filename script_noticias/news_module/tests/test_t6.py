from datetime import datetime, timezone
import json

import pytest

from app.llm.client import FakeLLMClient
from app.llm.summarizer import summarize
from app.models import CorporateEvent, Digest, IngestionPayload, NewsItem
from app.render import render_markdown


def payload(pdf_status="nao_tentado"):
    now = datetime(2026, 6, 15, 12, tzinfo=timezone.utc)
    return IngestionPayload(
        gerado_em=now,
        janela_inicio=now,
        janela_fim=now,
        noticias=[NewsItem(id="n1", fonte="InfoMoney", secao="mercados", titulo="Acao sobe", resumo="Empresa subiu.", url="https://news", publicado_em=now)],
        eventos=[CorporateEvent(id="e1", cnpj="1", empresa="Empresa", categoria="Fato Relevante", assunto="Comunicado", entregue_em=now, link_documento="https://pdf", texto_status=pdf_status)],
    )


def digest_json():
    return '{"data_referencia":"2026-06-15","resumo_executivo":"Resumo","itens":[{"tipo":"noticia","titulo":"Acao sobe","resumo":"Subiu.","relevancia":"alta","classe_ativo":"renda_variavel","entidades_citadas":["Empresa"],"fonte_url":"https://news"}],"avisos":[]}'


def test_summarize_valida_json_com_cercas():
    client = FakeLLMClient([f"```json\n{digest_json()}\n```"])
    result = summarize(payload(), client)
    assert isinstance(result, Digest)
    assert result.itens[0].relevancia == "alta"


def test_summarize_faz_retry_apos_json_invalido():
    client = FakeLLMClient(["nao json", digest_json()])
    result = summarize(payload(), client)
    assert result.resumo_executivo == "Resumo"
    assert len(client.calls) == 2
    assert "JSON anterior invalido" in client.calls[1][1]


def test_summarize_falha_apos_tres_respostas_invalidas():
    client = FakeLLMClient(["invalido", "invalido", "invalido"])
    with pytest.raises(ValueError):
        summarize(payload(), client)


def test_summarize_adiciona_aviso_de_pdf():
    client = FakeLLMClient([digest_json()])
    result = summarize(payload(pdf_status="falha"), client)
    assert "Texto de um ou mais PDFs nao disponivel" in result.avisos


def test_summarize_faz_chunking_e_consolidacao():
    first = digest_json()
    client = FakeLLMClient([first, first, first])
    result = summarize(payload(), client, max_input_chars=100)
    assert result.resumo_executivo == "Resumo"
    assert len(client.calls) == 3


def test_render_markdown_separa_e_ordena_itens():
    response = {
        "data_referencia": "2026-06-15",
        "resumo_executivo": "Resumo",
        "itens": [
            {"tipo": "noticia", "titulo": "Baixa", "resumo": "R", "relevancia": "baixa", "classe_ativo": "macro", "entidades_citadas": [], "fonte_url": "https://b"},
            {"tipo": "evento_corporativo", "titulo": "Evento", "resumo": "R", "relevancia": "alta", "classe_ativo": "renda_fixa", "entidades_citadas": ["Empresa"], "fonte_url": "https://e"},
        ],
        "avisos": [],
    }
    client = FakeLLMClient([json.dumps(response)])
    digest = summarize(payload(), client)
    markdown = render_markdown(digest)
    assert "## Eventos corporativos" in markdown
    assert "## Noticias" in markdown
    assert "[Fonte](https://e)" in markdown
