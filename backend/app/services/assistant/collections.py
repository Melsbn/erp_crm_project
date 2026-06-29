from typing import List

from .constants import COLLECTION_HINTS
from .text import _contains_any, _normalize_text


def _select_collections(
    question: str, history_text: str, available_collections: List[str]
) -> List[str]:
    text = _normalize_text(question)
    if history_text:
        text += " " + _normalize_text(history_text)

    selected = []
    for collection in available_collections:
        hints = COLLECTION_HINTS.get(collection)
        if hints and _contains_any(text, hints["keywords"]):
            selected.append(collection)

    # Always pull commandes + factures for financial questions (very common)
    if not selected or _contains_any(text, [
        "revenue", "sales", "vente", "total", "montant", "chiffre", "ca",
        "performance", "forecast", "prevision", "kpi", "dashboard",
    ]):
        for extra in ["commandes", "factures", "lignes_commande"]:
            if extra in available_collections and extra not in selected:
                selected.append(extra)

    if selected:
        return selected

    # Fallback: return all known collections in priority order
    preferred = [
        "clients", "prospects", "produits", "commandes", "lignes_commande",
        "factures", "paiements", "interactions", "users", "categories", "rapports",
    ]
    return [name for name in preferred if name in available_collections]


# ---------------------------------------------------------------------------
# Text-match token builder
# ---------------------------------------------------------------------------
