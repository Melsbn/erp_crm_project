from datetime import datetime
from typing import Any, Dict, List, Optional
import asyncio
import json
import re
import unicodedata

import httpx
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import ROLE_ADMIN, ROLE_EMPLOYE, ROLE_SUPERVISEUR, require_roles
from app.core.config import settings
from app.core.database import get_database

router = APIRouter()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_FORECAST_MONTHS = 3
MAX_HISTORY_TURNS = 8
# Increased sample size so the LLM has richer context
MAX_SAMPLE_DOCS = 20
MAX_TEXT_MATCHES = 15
MAX_FIELD_VALUE_LENGTH = 300

# ---------------------------------------------------------------------------
# Instant replies – cosmetic messages that need no DB round-trip
# ---------------------------------------------------------------------------
INSTANT_REPLIES = {
    "fr": {
        "merci": "De rien ! N'hésitez pas si vous avez d'autres questions.",
        "super": "Ravi de pouvoir vous aider !",
        "ok": "D'accord ! Autre chose ?",
        "bien": "Tant mieux ! Je suis là si vous avez d'autres questions.",
        "parfait": "Parfait ! N'hésitez pas si vous avez d'autres questions.",
        "au revoir": "Au revoir ! Bonne journée.",
        "bonne journée": "Merci, bonne journée à vous aussi !",
        "bonjour": "Bonjour ! Comment puis-je vous aider ?",
        "bonsoir": "Bonsoir ! Comment puis-je vous aider ?",
        "salut": "Salut ! Comment puis-je vous aider ?",
        "stp": "Bien sûr, je vous écoute.",
        "svp": "Bien sûr, je vous écoute.",
    },
    "en": {
        "thanks": "You're welcome! Let me know if you need anything else.",
        "thank you": "You're welcome! Let me know if you need anything else.",
        "great": "Glad I could help!",
        "ok": "Alright! Anything else?",
        "perfect": "Perfect! Let me know if you need anything else.",
        "goodbye": "Goodbye! Have a great day.",
        "bye": "Goodbye! Have a great day.",
        "hello": "Hello! How can I help you?",
        "hi": "Hi! How can I help you?",
        "please": "Of course, I'm listening.",
    },
}

# ---------------------------------------------------------------------------
# Collection metadata
# Extended keywords and text_fields so collection routing catches more intent.
# ---------------------------------------------------------------------------
COLLECTION_HINTS = {
    "users": {
        "label_en": "users/employees",
        "label_fr": "utilisateurs/employés",
        "keywords": [
            "user", "users", "employee", "employees", "employe", "employes",
            "admin", "supervisor", "superviseur", "role", "team", "equipe",
            "vendeur", "commercial", "agent", "staff", "personnel", "collaborateur",
            "account", "compte", "membre",
        ],
        "text_fields": ["nom", "prenom", "email", "role"],
        "sort_field": "dateCreation",
    },
    "clients": {
        "label_en": "clients",
        "label_fr": "clients",
        "keywords": [
            "client", "clients", "customer", "customers", "buyer", "acheteur",
            "email", "phone", "telephone", "address", "adresse", "entreprise", "company",
            "contact", "top client", "meilleur client", "fidele", "loyalty",
        ],
        "text_fields": ["nom", "prenom", "email", "telephone", "adresse", "entreprise", "type"],
        "sort_field": "dateCreation",
    },
    "prospects": {
        "label_en": "prospects",
        "label_fr": "prospects",
        "keywords": [
            "prospect", "prospects", "lead", "leads", "pipeline", "qualified",
            "qualifie", "contacte", "contacted", "conversion", "funnel", "entonnoir",
            "opportunite", "opportunity",
        ],
        "text_fields": ["nom", "prenom", "email", "telephone", "entreprise", "statut", "source"],
        "sort_field": "dateCreation",
    },
    "categories": {
        "label_en": "categories",
        "label_fr": "catégories",
        "keywords": [
            "category", "categories", "categorie", "catalog", "catalogue",
            "famille", "family", "groupe", "group", "type produit",
        ],
        "text_fields": ["nom", "description"],
        "sort_field": "dateCreation",
    },
    "produits": {
        "label_en": "products",
        "label_fr": "produits",
        "keywords": [
            "product", "products", "produit", "produits", "price", "prix",
            "stock", "available", "disponible", "article", "articles",
            "inventory", "inventaire", "item", "sku", "reference", "ref",
            "catalogue produit", "top produit", "best product", "best selling",
        ],
        "text_fields": ["nom", "description", "reference", "sku"],
        "sort_field": "dateCreation",
    },
    "commandes": {
        "label_en": "orders",
        "label_fr": "commandes",
        "keywords": [
            "order", "orders", "commande", "commandes", "sales", "sale",
            "vente", "ventes", "revenue", "revenu", "chiffre affaire", "ca",
            "status", "statut", "delivery", "livraison", "shipped", "expedie",
            "confirmed", "confirmee", "cancelled", "annulee", "pending", "en attente",
            "montant", "amount", "total", "forecast", "prevision", "performance",
            "best salesperson", "meilleur vendeur", "top vendeur", "top commercial",
        ],
        "text_fields": ["statut", "notes", "reference"],
        "sort_field": "dateCommande",
    },
    "lignes_commande": {
        "label_en": "order lines",
        "label_fr": "lignes de commande",
        "keywords": [
            "line", "lines", "ligne", "lignes", "quantity", "quantite",
            "unit price", "prix unitaire", "sous-total", "subtotal",
            "top product", "top produit", "best product", "meilleur produit",
            "best seller", "vendu", "sold",
        ],
        "text_fields": [],
        "sort_field": "dateCreation",
    },
    "factures": {
        "label_en": "invoices",
        "label_fr": "factures",
        "keywords": [
            "invoice", "invoices", "facture", "factures", "payment", "payments",
            "paiement", "paid", "unpaid", "impaye", "pending", "en attente",
            "overdue", "en retard", "echeance", "due", "balance", "solde",
            "numero facture", "invoice number", "billing", "facturation",
            "partially paid", "partielle",
        ],
        "text_fields": ["numeroFacture", "statutPaiement", "notes"],
        "sort_field": "dateEmission",
    },
    "paiements": {
        "label_en": "payments",
        "label_fr": "paiements",
        "keywords": [
            "payment", "payments", "paiement", "paiements", "reference",
            "virement", "carte", "cash", "especes", "cheque", "bank transfer",
            "received", "recu", "transaction",
        ],
        "text_fields": ["reference", "methode", "notes"],
        "sort_field": "datePaiement",
    },
    "interactions": {
        "label_en": "interactions",
        "label_fr": "interactions",
        "keywords": [
            "interaction", "interactions", "call", "appel", "meeting", "reunion",
            "email", "follow-up", "suivi", "history", "historique",
            "activity", "activite", "note", "task", "tache", "reminder", "rappel",
            "contact history", "crm activity",
        ],
        "text_fields": ["type", "description", "notes"],
        "sort_field": "date",
    },
    "rapports": {
        "label_en": "reports",
        "label_fr": "rapports",
        "keywords": [
            "report", "reports", "rapport", "rapports", "performance",
            "analytics", "analyse", "kpi", "dashboard", "summary", "resume",
            "statistique", "statistic", "metric",
        ],
        "text_fields": ["type", "titre", "description"],
        "sort_field": "dateGeneration",
    },
}

# ---------------------------------------------------------------------------
# Intent classifiers – match normalized question to a specific analytical need
# ---------------------------------------------------------------------------
def _is_count_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "how many", "combien", "number of", "nombre de", "count", "total ",
        "how much", "combien de",
    ])


def _is_unpaid_invoice_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "unpaid invoice", "unpaid invoices", "outstanding invoice", "outstanding invoices",
        "facture impayee", "factures impayees", "facture en attente", "factures en attente",
        "facture non payee", "factures non payees", "overdue invoice", "overdue invoices",
        "facture en retard", "factures en retard", "impaye", "impayes",
        "invoice pending", "pending invoice",
    ])


def _is_best_salesperson_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "best salesperson", "top salesperson", "best seller", "top seller",
        "meilleur vendeur", "meilleur commercial", "top vendeur", "top commercial",
        "best performing", "meilleure performance", "highest sales", "plus de ventes",
        "leading sales", "sales champion", "number one salesperson",
    ])


def _is_top_product_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "top product", "best product", "best selling product", "bestseller",
        "most sold", "most popular", "produit le plus vendu", "meilleur produit",
        "top produit", "article le plus vendu", "produit populaire",
    ])


def _is_top_client_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "top client", "best client", "biggest client", "meilleur client",
        "top customer", "best customer", "highest spending", "most orders",
        "client le plus", "plus gros client", "client fidele",
    ])


def _is_sales_summary_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "total sales", "total revenue", "chiffre d affaire", "ca total",
        "revenue total", "ventes totales", "sales total", "how much did we sell",
        "combien on a vendu", "montant total des ventes",
    ])


def _is_forecast_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "forecast", "prevision", "prediction", "predict", "next month",
        "mois prochain", "future", "futur", "trend", "tendance",
        "projection", "projeter",
    ])


def _is_order_status_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "order status", "statut commande", "commande statut",
        "pending order", "commande en attente", "delivered order",
        "commande livree", "confirmed order", "commande confirmee",
        "cancelled order", "commande annulee",
    ])


def _is_invoice_status_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "invoice status", "statut facture", "paid invoice", "facture payee",
        "unpaid invoice", "invoice breakdown", "factures par statut",
    ])


def _is_stock_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "stock", "inventory", "inventaire", "available", "disponible",
        "out of stock", "rupture de stock", "low stock", "stock faible",
        "in stock", "en stock",
    ])


# ---------------------------------------------------------------------------
# LLM call (Groq)
# ---------------------------------------------------------------------------
async def _groq_call(messages: List[Dict[str, str]], temperature: float = 0.1) -> str:
    if not settings.GROQ_API_KEY:
        return ""

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1500,  # Increased to allow fuller answers
    }
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(GROQ_API_URL, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception as exc:
            print(f"Groq attempt {attempt + 1} failed: {exc}")
            if attempt < 2:
                await asyncio.sleep(1.0)

    return ""


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------
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
async def _fetch_collection_counts(db, collections: List[str]) -> Dict[str, int]:
    tasks = [db[name].count_documents({}) for name in collections]
    values = await asyncio.gather(*tasks)
    return {name: values[index] for index, name in enumerate(collections)}


async def _fetch_collection_samples(
    db, collections: List[str]
) -> Dict[str, List[Dict[str, Any]]]:
    results: Dict[str, List[Dict[str, Any]]] = {}
    for name in collections:
        hints = COLLECTION_HINTS.get(name, {})
        sort_field = hints.get("sort_field")
        cursor = db[name].find({}, {"passwordHash": 0})
        if sort_field:
            cursor = cursor.sort(sort_field, -1)
        docs = await cursor.limit(MAX_SAMPLE_DOCS).to_list(MAX_SAMPLE_DOCS)
        results[name] = [_sanitize_document(doc) for doc in docs]
    return results


async def _find_text_matches(
    db, collections: List[str], question: str
) -> Dict[str, List[Dict[str, Any]]]:
    tokens = _build_regex_tokens(question)
    if not tokens:
        return {}

    matches: Dict[str, List[Dict[str, Any]]] = {}
    for name in collections:
        text_fields = COLLECTION_HINTS.get(name, {}).get("text_fields", [])
        if not text_fields:
            continue

        clauses: List[Dict[str, Any]] = []
        for token in tokens:
            for field in text_fields:
                clauses.append({field: {"$regex": re.escape(token), "$options": "i"}})

        docs = (
            await db[name]
            .find({"$or": clauses}, {"passwordHash": 0})
            .limit(MAX_TEXT_MATCHES)
            .to_list(MAX_TEXT_MATCHES)
        )
        if docs:
            matches[name] = [_sanitize_document(doc) for doc in docs]

    return matches


# ---------------------------------------------------------------------------
# Sales forecasting (unchanged algorithm, improved DataFrame validation)
# ---------------------------------------------------------------------------
def forecast_sales(df: pd.DataFrame, months_ahead: int = MAX_FORECAST_MONTHS) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["month", "predicted_sales"])

    working = df.copy()
    working["month"] = pd.to_datetime(working["month"])
    working = working.sort_values("month")
    working["predicted_sales"] = working["total"].rolling(3, min_periods=1).mean()
    recent = working["predicted_sales"].dropna().tail(3).values
    trend = (recent[-1] - recent[0]) / (len(recent) - 1) if len(recent) >= 2 else 0.0
    last_month = working["month"].max()
    last_pred = float(working["predicted_sales"].iloc[-1])

    future_rows = []
    for index in range(1, months_ahead + 1):
        next_month = last_month + pd.DateOffset(months=index)
        next_pred = max(0.0, last_pred + trend * index)  # prevent negative predictions
        future_rows.append({"month": next_month, "predicted_sales": round(next_pred, 2)})

    if future_rows:
        working = pd.concat([working, pd.DataFrame(future_rows)], ignore_index=True)

    working = working[["month", "predicted_sales"]].copy()
    working["predicted_sales"] = working["predicted_sales"].fillna(0).round(2)
    return working


def _safe_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for row in df.to_dict(orient="records"):
        clean: Dict[str, Any] = {}
        for key, value in row.items():
            if isinstance(value, (pd.Timestamp, datetime)):
                clean[key] = value.isoformat()
            elif isinstance(value, float) and pd.isna(value):
                clean[key] = None
            else:
                clean[key] = _safe_scalar(value)
        rows.append(clean)
    return rows


# ---------------------------------------------------------------------------
# Verified metrics – the authoritative aggregate layer
# Extended with stock, prospect status, and payment method breakdowns.
# ---------------------------------------------------------------------------
async def _compute_verified_metrics(db) -> Dict[str, Any]:
    metrics: Dict[str, Any] = {}

    collection_names = await db.list_collection_names()
    metrics["collection_counts"] = await _fetch_collection_counts(db, collection_names)

    # ---- Orders / Sales ----
    if "commandes" in collection_names:
        order_status_rows = await db["commandes"].aggregate([
            {"$group": {
                "_id": "$statut",
                "count": {"$sum": 1},
                "total": {"$sum": "$montantTotal"},
            }},
            {"$sort": {"count": -1, "_id": 1}},
        ]).to_list(20)
        metrics["orders_by_status"] = [
            {
                "statut": row.get("_id") or "UNKNOWN",
                "count": row.get("count", 0),
                "total": round(row.get("total", 0), 2),
            }
            for row in order_status_rows
        ]

        delivered_sales_rows = await db["commandes"].aggregate([
            {"$match": {"statut": {"$in": ["CONFIRMEE", "LIVREE"]}}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "total": {"$sum": "$montantTotal"},
            }},
        ]).to_list(1)
        delivered_sales = delivered_sales_rows[0] if delivered_sales_rows else {"count": 0, "total": 0}
        metrics["sales_summary"] = {
            "count": delivered_sales.get("count", 0),
            "total": round(delivered_sales.get("total", 0), 2),
        }

        # All-time total (including all statuses) for dashboard-style questions
        all_orders_rows = await db["commandes"].aggregate([
            {"$group": {"_id": None, "count": {"$sum": 1}, "total": {"$sum": "$montantTotal"}}},
        ]).to_list(1)
        all_orders = all_orders_rows[0] if all_orders_rows else {"count": 0, "total": 0}
        metrics["all_orders_summary"] = {
            "count": all_orders.get("count", 0),
            "total": round(all_orders.get("total", 0), 2),
        }

        # Monthly breakdown (for forecast)
        monthly_rows = await db["commandes"].aggregate([
            {
                "$project": {
                    "month": {
                        "$dateTrunc": {
                            "date": {"$toDate": "$dateCommande"},
                            "unit": "month",
                        }
                    },
                    "total": "$montantTotal",
                }
            },
            {"$group": {"_id": "$month", "total": {"$sum": "$total"}}},
            {"$sort": {"_id": 1}},
        ]).to_list(120)
        if monthly_rows:
            monthly_df = pd.DataFrame(
                [{"month": row["_id"], "total": row["total"]} for row in monthly_rows]
            )
            metrics["monthly_sales"] = _safe_records(
                monthly_df.rename(columns={"total": "predicted_sales"})
            )
            metrics["sales_forecast"] = _safe_records(forecast_sales(monthly_df))

        # Top salespeople
        top_salesperson_rows = await db["commandes"].aggregate([
            {"$match": {"statut": {"$in": ["CONFIRMEE", "LIVREE"]}}},
            {"$group": {
                "_id": "$userId",
                "salesCount": {"$sum": 1},
                "salesTotal": {"$sum": "$montantTotal"},
            }},
            {"$sort": {"salesTotal": -1}},
            {"$limit": 10},
            {
                "$lookup": {
                    "from": "users",
                    "let": {"userId": "$_id"},
                    "pipeline": [
                        {"$match": {"$expr": {
                            "$eq": [{"$toString": "$_id"}, {"$toString": "$$userId"}]
                        }}},
                        {"$project": {"nom": 1, "prenom": 1, "email": 1, "role": 1}},
                    ],
                    "as": "user",
                }
            },
            {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "salesCount": 1, "salesTotal": 1,
                "nom": "$user.nom", "prenom": "$user.prenom",
                "email": "$user.email", "role": "$user.role",
            }},
        ]).to_list(10)
        metrics["top_salespeople"] = [
            {
                "nom": f"{row.get('nom', '')} {row.get('prenom', '')}".strip() or "Unknown",
                "email": row.get("email", ""),
                "role": row.get("role", ""),
                "salesCount": row.get("salesCount", 0),
                "salesTotal": round(row.get("salesTotal", 0), 2),
            }
            for row in top_salesperson_rows
        ]

        # Top clients by spend
        top_client_rows = await db["commandes"].aggregate([
            {"$group": {
                "_id": "$clientId",
                "orderCount": {"$sum": 1},
                "totalSpent": {"$sum": "$montantTotal"},
            }},
            {"$sort": {"totalSpent": -1}},
            {"$limit": 10},
            {
                "$lookup": {
                    "from": "clients",
                    "let": {"clientId": "$_id"},
                    "pipeline": [
                        {"$match": {"$expr": {
                            "$eq": [{"$toString": "$_id"}, {"$toString": "$$clientId"}]
                        }}},
                        {"$project": {
                            "nom": 1, "prenom": 1, "email": 1,
                            "telephone": 1, "adresse": 1, "type": 1, "entreprise": 1,
                        }},
                    ],
                    "as": "client",
                }
            },
            {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "orderCount": 1, "totalSpent": 1,
                "nom": "$client.nom", "prenom": "$client.prenom",
                "email": "$client.email", "telephone": "$client.telephone",
                "adresse": "$client.adresse", "type": "$client.type",
                "entreprise": "$client.entreprise",
            }},
        ]).to_list(10)
        metrics["top_clients"] = [
            {
                "nom": f"{row.get('nom', '')} {row.get('prenom', '')}".strip() or "Unknown",
                "email": row.get("email", ""),
                "telephone": row.get("telephone", ""),
                "adresse": row.get("adresse", ""),
                "entreprise": row.get("entreprise", ""),
                "type": row.get("type", ""),
                "orderCount": row.get("orderCount", 0),
                "totalSpent": round(row.get("totalSpent", 0), 2),
            }
            for row in top_client_rows
        ]

    # ---- Invoices ----
    if "factures" in collection_names:
        invoice_status_rows = await db["factures"].aggregate([
            {"$group": {
                "_id": "$statutPaiement",
                "count": {"$sum": 1},
                "total": {"$sum": "$montantTotal"},
            }},
            {"$sort": {"count": -1, "_id": 1}},
        ]).to_list(20)
        metrics["invoices_by_status"] = [
            {
                "statut": row.get("_id") or "UNKNOWN",
                "count": row.get("count", 0),
                "total": round(row.get("total", 0), 2),
            }
            for row in invoice_status_rows
        ]

        unpaid_rows = await db["factures"].aggregate([
            {"$match": {"statutPaiement": {"$in": ["EN_ATTENTE", "PARTIELLE"]}}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "total": {"$sum": "$montantTotal"},
            }},
        ]).to_list(1)
        unpaid = unpaid_rows[0] if unpaid_rows else {"count": 0, "total": 0}
        metrics["unpaid_invoices"] = {
            "count": unpaid.get("count", 0),
            "total": round(unpaid.get("total", 0), 2),
        }

        paid_rows = await db["factures"].aggregate([
            {"$match": {"statutPaiement": "PAYEE"}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "total": {"$sum": "$montantTotal"},
            }},
        ]).to_list(1)
        paid = paid_rows[0] if paid_rows else {"count": 0, "total": 0}
        metrics["paid_invoices"] = {
            "count": paid.get("count", 0),
            "total": round(paid.get("total", 0), 2),
        }

    # ---- Products ----
    if "lignes_commande" in collection_names:
        top_product_rows = await db["lignes_commande"].aggregate([
            {
                "$group": {
                    "_id": "$produitId",
                    "quantitySold": {"$sum": "$quantite"},
                    "revenue": {
                        "$sum": {
                            "$ifNull": [
                                "$sousTotal",
                                {"$multiply": ["$quantite", "$prixUnitaire"]},
                            ]
                        }
                    },
                }
            },
            {"$sort": {"revenue": -1}},
            {"$limit": 10},
            {
                "$lookup": {
                    "from": "produits",
                    "let": {"productId": "$_id"},
                    "pipeline": [
                        {"$match": {"$expr": {
                            "$eq": [{"$toString": "$_id"}, {"$toString": "$$productId"}]
                        }}},
                        {"$project": {
                            "nom": 1, "description": 1, "prix": 1,
                            "stock": 1, "disponible": 1, "categorie": 1,
                        }},
                    ],
                    "as": "product",
                }
            },
            {"$unwind": {"path": "$product", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "quantitySold": 1, "revenue": 1,
                "nom": "$product.nom", "description": "$product.description",
                "prix": "$product.prix", "stock": "$product.stock",
                "disponible": "$product.disponible", "categorie": "$product.categorie",
            }},
        ]).to_list(10)
        metrics["top_products"] = [
            {
                "nom": row.get("nom") or "Unknown",
                "description": row.get("description", ""),
                "prix": round(row.get("prix", 0), 2),
                "stock": row.get("stock", 0),
                "disponible": row.get("disponible", False),
                "categorie": row.get("categorie", ""),
                "quantitySold": row.get("quantitySold", 0),
                "revenue": round(row.get("revenue", 0), 2),
            }
            for row in top_product_rows
        ]

    # ---- Products: stock summary ----
    if "produits" in collection_names:
        stock_rows = await db["produits"].aggregate([
            {"$group": {
                "_id": None,
                "totalProducts": {"$sum": 1},
                "totalStock": {"$sum": "$stock"},
                "available": {"$sum": {"$cond": [{"$eq": ["$disponible", True]}, 1, 0]}},
                "outOfStock": {"$sum": {"$cond": [{"$eq": ["$stock", 0]}, 1, 0]}},
            }},
        ]).to_list(1)
        if stock_rows:
            s = stock_rows[0]
            metrics["stock_summary"] = {
                "totalProducts": s.get("totalProducts", 0),
                "totalStock": s.get("totalStock", 0),
                "available": s.get("available", 0),
                "outOfStock": s.get("outOfStock", 0),
            }

    # ---- Prospects by status ----
    if "prospects" in collection_names:
        prospect_rows = await db["prospects"].aggregate([
            {"$group": {"_id": "$statut", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]).to_list(20)
        metrics["prospects_by_status"] = [
            {"statut": row.get("_id") or "UNKNOWN", "count": row.get("count", 0)}
            for row in prospect_rows
        ]

    # ---- Payments by method ----
    if "paiements" in collection_names:
        payment_rows = await db["paiements"].aggregate([
            {"$group": {
                "_id": "$methode",
                "count": {"$sum": 1},
                "total": {"$sum": "$montant"},
            }},
            {"$sort": {"total": -1}},
        ]).to_list(20)
        metrics["payments_by_method"] = [
            {
                "methode": row.get("_id") or "UNKNOWN",
                "count": row.get("count", 0),
                "total": round(row.get("total", 0), 2),
            }
            for row in payment_rows
        ]

    return metrics


# ---------------------------------------------------------------------------
# System prompt – much richer instructions so the LLM answers correctly
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Main endpoint
# ---------------------------------------------------------------------------
@router.post("/assistant/sales_forecast")
async def sales_forecast(
    payload: Dict[str, Any],
    chart: Optional[bool] = Query(None, include_in_schema=False),
    db=Depends(get_database),
    current_user: dict = Depends(
        require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE])
    ),
):
    del chart
    del current_user

    question = str(payload.get("question") or "").strip()
    history = payload.get("history") or []
    language = _detect_language(payload.get("language"), question)

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    # Fast path for social niceties
    q_lower = _normalize_text(question)
    if q_lower in INSTANT_REPLIES[language]:
        return {
            "answer": INSTANT_REPLIES[language][q_lower],
            "chart": None,
            "predictions": [],
            "top_products": [],
            "top_clients": [],
        }

    history_text = " ".join(
        str(msg.get("content", ""))[:200]
        for msg in _strip_charts(history[-6:])
    )
    available_collections = await db.list_collection_names()
    selected_collections = _select_collections(question, history_text, available_collections)

    # Run all DB operations concurrently where possible
    collection_counts, metrics = await asyncio.gather(
        _fetch_collection_counts(db, available_collections),
        _compute_verified_metrics(db),
    )
    collection_samples, text_matches = await asyncio.gather(
        _fetch_collection_samples(db, selected_collections),
        _find_text_matches(db, selected_collections, question),
    )

    user_message_with_data = _build_data_briefing(
        question=question,
        language=language,
        collection_counts=collection_counts,
        selected_collections=selected_collections,
        samples=collection_samples,
        matches=text_matches,
        metrics=metrics,
    )

    messages = _build_messages(
        history, _build_system_prompt(language), user_message_with_data
    )
    answer = await _groq_call(messages)

    if not answer:
        answer = _fallback_answer(
            question=question,
            language=language,
            collection_counts=collection_counts,
            selected_collections=selected_collections,
            matches=text_matches,
            metrics=metrics,
        )

    return {
        "answer": answer,
        "chart": None,
        "predictions": metrics.get("sales_forecast", []),
        "top_products": metrics.get("top_products", []),
        "top_clients": metrics.get("top_clients", []),
    }
