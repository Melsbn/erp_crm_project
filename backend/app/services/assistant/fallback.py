from typing import Any, Dict, List
import json

from .constants import COLLECTION_HINTS, MAX_FORECAST_MONTHS
from .intent import (
    _is_count_question,
    _is_forecast_question,
    _is_sales_summary_question,
    _is_stock_question,
    _is_top_client_question,
    _is_top_product_question,
    _is_best_salesperson_question,
    _is_unpaid_invoice_question,
)
from .text import _contains_any, _normalize_text


def _fallback_answer(
    question: str,
    language: str,
    collection_counts: Dict[str, int],
    selected_collections: List[str],
    matches: Dict[str, List[Dict[str, Any]]],
    metrics: Dict[str, Any],
) -> str:
    en = language == "en"

    # Unpaid invoices
    if _is_unpaid_invoice_question(question) and metrics.get("unpaid_invoices"):
        u = metrics["unpaid_invoices"]
        if en:
            return (
                f"There are {u['count']} unpaid or partially paid invoices "
                f"totalling {u['total']:,.2f}."
            )
        return (
            f"Il y a {u['count']} factures impayées ou partiellement payées "
            f"pour un total de {u['total']:,.2f}."
        )

    # Best salesperson
    if _is_best_salesperson_question(question) and metrics.get("top_salespeople"):
        top = metrics["top_salespeople"][0]
        if en:
            return (
                f"The top salesperson is {top['nom']} with {top['salesCount']} "
                f"confirmed/delivered orders totalling {top['salesTotal']:,.2f}."
            )
        return (
            f"Le meilleur vendeur est {top['nom']} avec {top['salesCount']} "
            f"commandes confirmées/livrées pour un total de {top['salesTotal']:,.2f}."
        )

    # Top product
    if _is_top_product_question(question) and metrics.get("top_products"):
        top = metrics["top_products"][0]
        if en:
            return (
                f"The best-selling product is '{top['nom']}' with {top['quantitySold']} "
                f"units sold and revenue of {top['revenue']:,.2f}."
            )
        return (
            f"Le produit le plus vendu est « {top['nom']} » avec {top['quantitySold']} "
            f"unités vendues et un revenu de {top['revenue']:,.2f}."
        )

    # Top client
    if _is_top_client_question(question) and metrics.get("top_clients"):
        top = metrics["top_clients"][0]
        if en:
            return (
                f"The top client is {top['nom']} with {top['orderCount']} orders "
                f"totalling {top['totalSpent']:,.2f}."
            )
        return (
            f"Le meilleur client est {top['nom']} avec {top['orderCount']} commandes "
            f"pour un total de {top['totalSpent']:,.2f}."
        )

    # Total sales summary
    if _is_sales_summary_question(question) and metrics.get("sales_summary"):
        s = metrics["sales_summary"]
        if en:
            return (
                f"Total confirmed/delivered sales: {s['count']} orders "
                f"worth {s['total']:,.2f}."
            )
        return (
            f"Ventes totales confirmées/livrées : {s['count']} commandes "
            f"pour {s['total']:,.2f}."
        )

    # Forecast
    if _is_forecast_question(question) and metrics.get("sales_forecast"):
        forecast = metrics["sales_forecast"][-MAX_FORECAST_MONTHS:]
        lines = [
            f"  {r['month'][:7]}: {r['predicted_sales']:,.2f}" for r in forecast
        ]
        if en:
            return "Sales forecast for the next months:\n" + "\n".join(lines)
        return "Prévisions de ventes pour les prochains mois :\n" + "\n".join(lines)

    # Stock question
    if _is_stock_question(question) and metrics.get("stock_summary"):
        s = metrics["stock_summary"]
        if en:
            return (
                f"Product inventory: {s['totalProducts']} products, "
                f"{s['totalStock']} total units in stock, "
                f"{s['available']} available, {s['outOfStock']} out of stock."
            )
        return (
            f"Inventaire produits : {s['totalProducts']} produits, "
            f"{s['totalStock']} unités totales en stock, "
            f"{s['available']} disponibles, {s['outOfStock']} en rupture de stock."
        )

    # Count questions
    if _is_count_question(question):
        normalized = _normalize_text(question)
        for collection in selected_collections:
            hints = COLLECTION_HINTS.get(collection, {})
            if _contains_any(normalized, hints.get("keywords", [])):
                count = collection_counts.get(collection, 0)
                label = hints.get("label_en" if en else "label_fr", collection)
                if en:
                    return f"There are {count:,} {label} in the database."
                return f"Il y a {count:,} {label} dans la base de données."

    # Text match results
    if matches:
        first_collection = next(iter(matches))
        records = matches[first_collection][:3]
        if en:
            return (
                f"I found matching records in {first_collection}:\n"
                f"{json.dumps(records, ensure_ascii=True, indent=2)}"
            )
        return (
            f"J'ai trouvé des enregistrements correspondants dans {first_collection} :\n"
            f"{json.dumps(records, ensure_ascii=True, indent=2)}"
        )

    # Generic count summary
    summaries = []
    for collection in selected_collections[:5]:
        count = collection_counts.get(collection, 0)
        label = COLLECTION_HINTS.get(collection, {}).get(
            "label_en" if en else "label_fr", collection
        )
        summaries.append(f"{label}: {count:,}")

    if en:
        return (
            "I could not produce a more specific answer. "
            "Available verified counts: " + ", ".join(summaries) + "."
        )
    return (
        "Je ne peux pas produire de réponse plus précise. "
        "Comptes vérifiés disponibles : " + ", ".join(summaries) + "."
    )

