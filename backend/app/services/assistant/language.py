from typing import Any

from .text import _contains_any, _normalize_text


def _detect_language(payload_language: Any, question: str) -> str:
    raw = str(payload_language or "").lower().strip()
    if raw.startswith("en"):
        return "en"
    if raw.startswith("fr"):
        return "fr"

    q = _normalize_text(question)
    if _contains_any(q, [
        " how ", " what ", " which ", "who ", "invoice", "order", "client",
        "sales", "revenue", "show me", "give me", "list", "top ", "best ",
    ]):
        return "en"
    return "fr"
