import io
from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pypdf
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.models import CorporateEvent
from app.sources import pdf_text


def make_pdf(text: str) -> bytes:
    writer = pypdf.PdfWriter()
    page = writer.add_blank_page(width=300, height=300)
    stream = DecodedStreamObject()
    stream.set_data(
        f"BT /F1 12 Tf 40 200 Td ({text}) Tj ET".encode()
    )
    page[NameObject("/Contents")] = stream
    page[NameObject("/Resources")] = DictionaryObject(
        {
            NameObject("/Font"): DictionaryObject(
                {
                    NameObject("/F1"): DictionaryObject(
                        {
                            NameObject("/Type"): NameObject("/Font"),
                            NameObject("/Subtype"): NameObject("/Type1"),
                            NameObject("/BaseFont"): NameObject("/Helvetica"),
                        }
                    )
                }
            )
        }
    )
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def event():
    return CorporateEvent(
        id="123-1",
        cnpj="00000000000191",
        empresa="Empresa Teste",
        categoria="Fato Relevante",
        entregue_em=datetime(2026, 6, 15, tzinfo=ZoneInfo("America/Sao_Paulo")),
        link_documento="https://cvm.test/documento.pdf",
    )


class Response:
    def __init__(self, content, content_type="application/pdf", status_error=None):
        self.content = content
        self.headers = {"Content-Type": content_type}
        self.status_error = status_error

    def raise_for_status(self):
        if self.status_error:
            raise self.status_error


def settings(fetch=True, max_bytes=10_000_000, max_chars=6000):
    return SimpleNamespace(
        fetch_pdf_text=fetch,
        http_timeout=30,
        user_agent="test-agent",
        pdf_max_bytes=max_bytes,
        pdf_max_chars=max_chars,
    )


def test_enrich_with_pdf_text_extrai_e_trunca(monkeypatch):
    monkeypatch.setattr(pdf_text, "load_settings", lambda: settings(max_chars=5))
    monkeypatch.setattr(
        pdf_text.requests,
        "get",
        lambda *args, **kwargs: Response(make_pdf("Texto do documento")),
    )

    enriched = pdf_text.enrich_with_pdf_text([event()])

    assert enriched[0].texto_status == "ok"
    assert enriched[0].texto_documento is not None
    assert len(enriched[0].texto_documento) <= 5


def test_enrich_pdf_404_marca_falha(monkeypatch):
    monkeypatch.setattr(pdf_text, "load_settings", lambda: settings())
    monkeypatch.setattr(
        pdf_text.requests,
        "get",
        lambda *args, **kwargs: Response(b"", status_error=pdf_text.requests.HTTPError("404")),
    )

    enriched = pdf_text.enrich_with_pdf_text([event()])

    assert enriched[0].texto_status == "falha"
    assert enriched[0].texto_documento is None


def test_enrich_pdf_sem_texto_marca_falha(monkeypatch):
    monkeypatch.setattr(pdf_text, "load_settings", lambda: settings())
    monkeypatch.setattr(
        pdf_text.requests,
        "get",
        lambda *args, **kwargs: Response(make_pdf("")),
    )

    enriched = pdf_text.enrich_with_pdf_text([event()])

    assert enriched[0].texto_status == "falha"


def test_enrich_pdf_grande_demais_marca_falha(monkeypatch):
    content = make_pdf("texto")
    monkeypatch.setattr(pdf_text, "load_settings", lambda: settings(max_bytes=len(content) - 1))
    monkeypatch.setattr(
        pdf_text.requests,
        "get",
        lambda *args, **kwargs: Response(content),
    )

    enriched = pdf_text.enrich_with_pdf_text([event()])

    assert enriched[0].texto_status == "falha"


def test_enrich_pdf_nao_tenta_quando_desabilitado(monkeypatch):
    monkeypatch.setattr(pdf_text, "load_settings", lambda: settings(fetch=False))
    monkeypatch.setattr(
        pdf_text.requests,
        "get",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("nao deveria baixar")),
    )

    enriched = pdf_text.enrich_with_pdf_text([event()])

    assert enriched[0].texto_status == "nao_tentado"
