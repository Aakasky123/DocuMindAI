from pathlib import Path


def parse_document(path: str) -> tuple[list[dict], int | None]:
    file_path = Path(path)
    suffix = file_path.suffix.lower()
    if suffix == ".txt":
        return [{"text": file_path.read_text(encoding="utf-8", errors="ignore"), "page_number": None}], None
    if suffix == ".docx":
        return _parse_docx(file_path), None
    if suffix == ".pdf":
        return _parse_pdf(file_path)
    raise ValueError(f"Unsupported file type: {suffix}")


def _parse_docx(path: Path) -> list[dict]:
    try:
        from docx import Document
    except ImportError as exc:
        raise RuntimeError("python-docx is required to parse DOCX files") from exc

    doc = Document(str(path))
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return [{"text": text, "page_number": None}]


def _parse_pdf(path: Path) -> tuple[list[dict], int | None]:
    try:
        from unstructured.partition.pdf import partition_pdf

        elements = partition_pdf(filename=str(path), strategy="fast")
        pages: dict[int | None, list[str]] = {}
        for element in elements:
            page = getattr(getattr(element, "metadata", None), "page_number", None)
            pages.setdefault(page, []).append(str(element))
        parsed = [{"text": "\n".join(parts), "page_number": page} for page, parts in pages.items()]
        return parsed, len(pages) or None
    except Exception:
        return _parse_pdf_fallback(path)


def _parse_pdf_fallback(path: Path) -> tuple[list[dict], int | None]:
    try:
        import fitz

        with fitz.open(str(path)) as pdf:
            pages = [
                {"text": page.get_text("text"), "page_number": page.number + 1}
                for page in pdf
                if page.get_text("text").strip()
            ]
            return pages, pdf.page_count
    except Exception:
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(path))
            pages = [
                {"text": page.extract_text() or "", "page_number": idx + 1}
                for idx, page in enumerate(reader.pages)
            ]
            return [page for page in pages if page["text"].strip()], len(reader.pages)
        except Exception as exc:
            raise RuntimeError("Unable to parse PDF with Unstructured, PyMuPDF, or pypdf") from exc
