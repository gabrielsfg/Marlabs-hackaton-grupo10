from app.models import Digest


def render_markdown(digest: Digest) -> str:
    lines = [f"# Resumo de investimentos - {digest.data_referencia}", "", "## Resumo executivo", digest.resumo_executivo, ""]
    for title, kind in (("Eventos corporativos", "evento_corporativo"), ("Noticias", "noticia")):
        lines.extend([f"## {title}", ""])
        items = [item for item in digest.itens if item.tipo == kind]
        for item in sorted(items, key=lambda value: {"alta": 0, "media": 1, "baixa": 2}[value.relevancia]):
            entities = ", ".join(item.entidades_citadas) or "Nenhuma"
            lines.extend([f"### {item.titulo}", f"**Relevancia:** {item.relevancia}  ", f"**Classe:** {item.classe_ativo}  ", f"{item.resumo}  ", f"Entidades: {entities}  ", f"[Fonte]({item.fonte_url})", ""])
    if digest.avisos:
        lines.extend(["## Avisos", ""] + [f"- {warning}" for warning in digest.avisos] + [""])
    return "\n".join(lines)
