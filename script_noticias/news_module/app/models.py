from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, field_validator

SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def _as_sao_paulo(value: datetime) -> datetime:
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        raise ValueError("datetime deve ser timezone-aware")
    return value.astimezone(SAO_PAULO)


class NewsItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    fonte: str
    secao: str
    titulo: str
    resumo: str
    url: str
    publicado_em: datetime

    @field_validator("publicado_em")
    @classmethod
    def publicado_em_sao_paulo(cls, value: datetime) -> datetime:
        return _as_sao_paulo(value)


class CorporateEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    cnpj: str
    empresa: str
    codigo_cvm: str | None = None
    categoria: str
    assunto: str | None = None
    entregue_em: datetime
    data_referencia: date | None = None
    link_documento: str
    texto_documento: str | None = None
    texto_status: Literal["ok", "falha", "nao_tentado"] = "nao_tentado"

    @field_validator("entregue_em")
    @classmethod
    def entregue_em_sao_paulo(cls, value: datetime) -> datetime:
        return _as_sao_paulo(value)


class IngestionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gerado_em: datetime
    janela_inicio: datetime
    janela_fim: datetime
    noticias: list[NewsItem] = []
    eventos: list[CorporateEvent] = []

    @field_validator("gerado_em", "janela_inicio", "janela_fim")
    @classmethod
    def datetimes_sao_paulo(cls, value: datetime) -> datetime:
        return _as_sao_paulo(value)


class DigestItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: Literal["noticia", "evento_corporativo"]
    titulo: str
    resumo: str
    relevancia: Literal["alta", "media", "baixa"]
    classe_ativo: Literal["renda_variavel", "renda_fixa", "macro", "misto"]
    entidades_citadas: list[str] = []
    fonte_url: str


class Digest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data_referencia: date
    resumo_executivo: str
    itens: list[DigestItem] = []
    avisos: list[str] = []
