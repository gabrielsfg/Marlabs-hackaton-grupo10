from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from app.models import SAO_PAULO, CorporateEvent, Digest, DigestItem, IngestionPayload, NewsItem


def test_news_item_converte_utc_para_sao_paulo():
    item = NewsItem(
        id="abc",
        fonte="InfoMoney",
        secao="mercados",
        titulo="Titulo",
        resumo="Resumo",
        url="https://exemplo/noticia",
        publicado_em=datetime(2026, 6, 15, 15, 0, tzinfo=timezone.utc),
    )
    assert item.publicado_em == datetime(2026, 6, 15, 12, 0, tzinfo=SAO_PAULO)


def test_news_item_rejeita_datetime_naive():
    with pytest.raises(ValidationError):
        NewsItem(
            id="abc",
            fonte="InfoMoney",
            secao="mercados",
            titulo="Titulo",
            resumo="Resumo",
            url="https://exemplo/noticia",
            publicado_em=datetime(2026, 6, 15, 12, 0),
        )


def test_corporate_event_campos_opcionais():
    event = CorporateEvent(
        id="1-1",
        cnpj="00000000000191",
        empresa="Empresa",
        categoria="Fato Relevante",
        entregue_em=datetime(2026, 1, 1, 0, 0, tzinfo=SAO_PAULO),
        link_documento="https://exemplo/doc.pdf",
    )
    assert event.codigo_cvm is None
    assert event.assunto is None
    assert event.texto_documento is None
    assert event.texto_status == "nao_tentado"
    assert event.data_referencia is None


def test_corporate_event_texto_status_invalido():
    with pytest.raises(ValidationError):
        CorporateEvent(
            id="1-1",
            cnpj="00000000000191",
            empresa="Empresa",
            categoria="Fato Relevante",
            entregue_em=datetime(2026, 1, 1, 0, 0, tzinfo=SAO_PAULO),
            link_documento="https://exemplo/doc.pdf",
            texto_status="pendente",
        )


def test_ingestion_payload_listas_vazias():
    agora = datetime(2026, 6, 15, 12, 0, tzinfo=SAO_PAULO)
    payload = IngestionPayload(
        gerado_em=agora,
        janela_inicio=agora,
        janela_fim=agora,
    )
    assert payload.noticias == []
    assert payload.eventos == []


def test_digest_e_item():
    digest = Digest(
        data_referencia=date(2026, 6, 15),
        resumo_executivo="Linha 1",
        itens=[
            DigestItem(
                tipo="noticia",
                titulo="Titulo",
                resumo="Duas frases. Terceira.",
                relevancia="alta",
                classe_ativo="renda_variavel",
                entidades_citadas=["Petrobras"],
                fonte_url="https://exemplo",
            )
        ],
        avisos=["texto do PDF indisponivel"],
    )
    assert digest.itens[0].tipo == "noticia"
    assert digest.avisos == ["texto do PDF indisponivel"]


def test_digest_item_rejeita_literal_invalido():
    with pytest.raises(ValidationError):
        DigestItem(
            tipo="outro",
            titulo="Titulo",
            resumo="Resumo",
            relevancia="alta",
            classe_ativo="macro",
            fonte_url="https://exemplo",
        )
