import json
import re

from app.models import Digest, IngestionPayload
from app.llm.client import LLMClient

SYSTEM_PROMPT = """Voce e um assistente de pesquisa de um assessor de investimentos brasileiro.
Resuma noticias e eventos corporativos das ultimas 24 horas.
Use apenas o conteudo fornecido. Nao invente fatos, numeros, tickers ou empresas.
Cite em entidades_citadas somente nomes que aparecem explicitamente no texto.
Nao faca recomendacao de compra ou venda e nao projete precos.
Responda somente com JSON valido no formato Digest."""


def _strip_fences(value: str) -> str:
    return re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", value.strip(), flags=re.IGNORECASE)


def _item_text(payload: IngestionPayload) -> list[str]:
    records = []
    for item in payload.noticias:
        records.append(json.dumps({"tipo": "noticia", "titulo": item.titulo, "texto": item.resumo, "data": item.publicado_em.isoformat(), "url": item.url}, ensure_ascii=False))
    for item in payload.eventos:
        records.append(json.dumps({"tipo": "evento_corporativo", "titulo": item.assunto or item.categoria, "empresa": item.empresa, "texto": item.texto_documento, "data": item.entregue_em.isoformat(), "url": item.link_documento}, ensure_ascii=False))
    return records


def _parse(client: LLMClient, user: str, retries: int = 2) -> Digest:
    error = ""
    for _ in range(retries + 1):
        prompt = user if not error else f"{user}\nJSON anterior invalido. Corrija este erro: {error}"
        try:
            return Digest.model_validate_json(_strip_fences(client.generate(SYSTEM_PROMPT, prompt)))
        except Exception as exc:
            error = str(exc)
    raise ValueError(f"LLM nao retornou Digest valido: {error}")


def summarize(payload: IngestionPayload, client: LLMClient, max_input_chars: int = 60000) -> Digest:
    records = _item_text(payload)
    header = "Gere um Digest para a data de referencia " + str(payload.janela_fim.date()) + ". Itens:\n"
    text = header + "\n".join(f"{index}. {record}" for index, record in enumerate(records, 1))
    if len(text) <= max_input_chars:
        digest = _parse(client, text)
    else:
        chunks = []
        current = header
        for record in records:
            available = max_input_chars - len(header) - 1
            if len(record) > available:
                record = record[:available]
            if len(current) + len(record) + 1 > max_input_chars and current != header:
                chunks.append(current)
                current = header
            current += record + "\n"
        if current != header:
            chunks.append(current)
        partials = [_parse(client, chunk) for chunk in chunks]
        merge_prompt = header + "Consolide estes resultados parciais em um unico Digest:\n" + json.dumps([partial.model_dump(mode="json") for partial in partials], ensure_ascii=False)
        digest = _parse(client, merge_prompt)
    warnings = list(digest.avisos)
    if any(event.texto_status == "falha" for event in payload.eventos):
        warnings.append("Texto de um ou mais PDFs nao disponivel")
    if len(text) > max_input_chars and "Entrada dividida em blocos" not in warnings:
        warnings.append("Entrada dividida em blocos por limite de tamanho")
    return digest.model_copy(update={"avisos": warnings})
