from datetime import datetime
from typing import Any, Dict, List

from .text import _serialize_for_prompt, _strip_charts, _trim_history


def _build_messages(
    history: List[Dict[str, Any]], system_prompt: str, new_user_message: str
) -> List[Dict[str, str]]:
    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    trimmed = _trim_history(_strip_charts(history[1:]))
    for msg in trimmed:
        role = "assistant" if msg.get("role") == "assistant" else "user"
        content = str(msg.get("content", "")).strip()
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": new_user_message})
    return messages


def _build_system_prompt(language: str) -> str:
    today = datetime.utcnow().strftime("%Y-%m-%d")

    if language == "en":
        return (
            f"You are a precise CRM/ERP data assistant. Today's date is {today}.\n"
            "RULES:\n"
            "1. Answer ONLY in English.\n"
            "2. Use ONLY numbers and facts from the 'verified_metrics' section of the briefing. "
            "   These are exact aggregations computed directly from the database — trust them completely.\n"
            "3. For counts (how many X), read 'database_inventory' or 'selected_collection_totals'. "
            "   These are exact counts.\n"
            "4. 'recent_records' are SAMPLES (partial snapshots) unless explicitly marked complete. "
            "   Never derive totals or averages from samples alone.\n"
            "5. Never invent names, amounts, dates, IDs, or any data not present in the briefing.\n"
            "6. If the briefing lacks information to answer fully, say so clearly and give what partial "
            "   information IS available.\n"
            "7. Format currency values with 2 decimal places. Format numbers with commas for thousands.\n"
            "8. For ranking questions (best, top, highest), use the pre-computed lists in verified_metrics.\n"
            "9. Never expose internal field names like _id, passwordHash, or MongoDB syntax.\n"
            "10. Keep answers concise and factual. Use bullet points for lists."
        )

    return (
        f"Tu es un assistant CRM/ERP précis. La date d'aujourd'hui est {today}.\n"
        "RÈGLES :\n"
        "1. Réponds UNIQUEMENT en français.\n"
        "2. Utilise UNIQUEMENT les chiffres et faits de la section 'verified_metrics' du briefing. "
        "   Ce sont des agrégations exactes calculées directement depuis la base de données — fais-leur entièrement confiance.\n"
        "3. Pour les comptages (combien de X), lis 'database_inventory' ou 'selected_collection_totals'. "
        "   Ce sont des comptes exacts.\n"
        "4. 'recent_records' sont des ÉCHANTILLONS (extraits partiels) sauf mention contraire explicite. "
        "   Ne dérive jamais des totaux ou moyennes à partir des échantillons seuls.\n"
        "5. N'invente jamais de noms, montants, dates, identifiants ou données absentes du briefing.\n"
        "6. Si le briefing manque d'information pour répondre complètement, dis-le clairement et "
        "   donne les informations partielles disponibles.\n"
        "7. Formate les valeurs monétaires avec 2 décimales. Formate les grands nombres avec des espaces.\n"
        "8. Pour les classements (meilleur, top, plus élevé), utilise les listes précalculées dans verified_metrics.\n"
        "9. N'expose jamais les champs internes comme _id, passwordHash, ou la syntaxe MongoDB.\n"
        "10. Reste concis et factuel. Utilise des points pour les listes."
    )


# ---------------------------------------------------------------------------
# Briefing builder
# ---------------------------------------------------------------------------


def _build_data_briefing(
    question: str,
    language: str,
    collection_counts: Dict[str, int],
    selected_collections: List[str],
    samples: Dict[str, List[Dict[str, Any]]],
    matches: Dict[str, List[Dict[str, Any]]],
    metrics: Dict[str, Any],
) -> str:
    recent_section = [
        {
            "collection": name,
            "total_records_in_collection": collection_counts.get(name, 0),
            "sample_record_count": len(docs),
            "sample_is_partial": len(docs) < collection_counts.get(name, 0),
            "records": docs,
        }
        for name, docs in samples.items()
        if docs
    ]

    briefing = {
        "question": question,
        "selected_collections": selected_collections,
        "database_inventory": collection_counts,
        "selected_collection_totals": {
            name: collection_counts.get(name, 0) for name in selected_collections
        },
        "verified_metrics": {
            # Sales & orders
            "sales_summary": metrics.get("sales_summary"),
            "all_orders_summary": metrics.get("all_orders_summary"),
            "orders_by_status": metrics.get("orders_by_status"),
            "monthly_sales": metrics.get("monthly_sales"),
            "sales_forecast": metrics.get("sales_forecast"),
            # Invoices
            "invoices_by_status": metrics.get("invoices_by_status"),
            "unpaid_invoices": metrics.get("unpaid_invoices"),
            "paid_invoices": metrics.get("paid_invoices"),
            # Rankings
            "top_salespeople": metrics.get("top_salespeople"),
            "top_clients": metrics.get("top_clients"),
            "top_products": metrics.get("top_products"),
            # Products / stock
            "stock_summary": metrics.get("stock_summary"),
            # Prospects
            "prospects_by_status": metrics.get("prospects_by_status"),
            # Payments
            "payments_by_method": metrics.get("payments_by_method"),
        },
        "matched_records": matches,
        "recent_records": recent_section,
    }

    prefix = (
        "Verified database briefing" if language == "en"
        else "Briefing vérifié de la base de données"
    )
    return f"{prefix}:\n{_serialize_for_prompt(briefing)}"


# ---------------------------------------------------------------------------
# Fallback answer (used when LLM call fails)
# Covers all major intent types so the user always gets a real answer.
# ---------------------------------------------------------------------------
