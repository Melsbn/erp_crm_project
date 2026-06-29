from datetime import datetime
from typing import Any, Dict, List
import json
import re
import unicodedata

from .constants import MAX_FIELD_VALUE_LENGTH, MAX_HISTORY_TURNS


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower()


def _contains_any(text: str, values: List[str]) -> bool:
    return any(value in text for value in values)


def _trim_history(history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    max_items = MAX_HISTORY_TURNS * 2
    return history[-max_items:] if len(history) > max_items else history


def _strip_charts(history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cleaned: List[Dict[str, Any]] = []
    for msg in history:
        content = msg.get("content", "")
        if isinstance(content, str) and "data:image" in content:
            content = "[chart omitted]"
        cleaned.append({**msg, "content": content})
    return cleaned


def _safe_scalar(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return round(value, 2) if isinstance(value, float) else value
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_safe_scalar(item) for item in value[:10]]
    if isinstance(value, dict):
        return {str(key): _safe_scalar(val) for key, val in value.items()}
    return str(value)[:MAX_FIELD_VALUE_LENGTH]


def _sanitize_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    clean: Dict[str, Any] = {}
    for key, value in doc.items():
        if key in {"_id", "passwordHash"}:
            continue
        clean[key] = _safe_scalar(value)
    return clean


def _serialize_for_prompt(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True, default=str)


# ---------------------------------------------------------------------------
# Collection selection
# Broadened: if nothing matches we now return ALL available collections so the
# LLM always has context rather than falling back on nothing.
# ---------------------------------------------------------------------------


def _build_regex_tokens(question: str) -> List[str]:
    raw_tokens = re.findall(r"[A-Za-zÀ-ÿ0-9@._-]{3,}", question or "")
    stop_words = {
        "what", "which", "show", "list", "give", "with", "from", "that", "this",
        "combien", "montre", "liste", "avec", "pour", "dans", "the", "les", "des",
        "are", "was", "were", "est", "sont", "invoice", "order", "client", "product",
        "commande", "facture", "produit", "prospect", "user", "employee",
        "how", "many", "much", "get", "find", "tell", "about",
        "qui", "quel", "quelle", "quels", "quelles", "mes", "nos",
        "vous", "moi", "lui", "elle", "has", "have", "can",
    }
    tokens = []
    for token in raw_tokens:
        normalized = _normalize_text(token)
        if normalized not in stop_words and len(normalized) >= 3:
            tokens.append(token)
    return tokens[:8]


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
