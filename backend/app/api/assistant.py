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
MAX_SAMPLE_DOCS = 12
MAX_TEXT_MATCHES = 10
MAX_FIELD_VALUE_LENGTH = 240

INSTANT_REPLIES = {
    "fr": {
        "merci": "De rien ! N'hesitez pas si vous avez d'autres questions.",
        "super": "Ravi de pouvoir vous aider !",
        "ok": "D'accord ! Autre chose ?",
        "bien": "Tant mieux ! Je suis la si vous avez d'autres questions.",
        "parfait": "Parfait ! N'hesitez pas si vous avez d'autres questions.",
        "au revoir": "Au revoir ! Bonne journee.",
        "bonne journee": "Merci, bonne journee a vous aussi !",
        "bonjour": "Bonjour ! Comment puis-je vous aider ?",
        "bonsoir": "Bonsoir ! Comment puis-je vous aider ?",
        "salut": "Salut ! Comment puis-je vous aider ?",
        "stp": "Bien sur, je vous ecoute.",
        "svp": "Bien sur, je vous ecoute.",
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

COLLECTION_HINTS = {
    "users": {
        "label_en": "users/employees",
        "label_fr": "utilisateurs/employes",
        "keywords": [
            "user", "users", "employee", "employees", "employe", "employes",
            "admin", "supervisor", "role", "team", "equipe", "vendeur", "commercial",
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
        ],
        "text_fields": ["nom", "prenom", "email", "telephone", "adresse", "entreprise", "type"],
        "sort_field": "dateCreation",
    },
    "prospects": {
        "label_en": "prospects",
        "label_fr": "prospects",
        "keywords": [
            "prospect", "prospects", "lead", "leads", "pipeline", "qualified",
            "qualifie", "contacte", "contacted",
        ],
        "text_fields": ["nom", "prenom", "email", "telephone", "entreprise", "statut"],
        "sort_field": "dateCreation",
    },
    "categories": {
        "label_en": "categories",
        "label_fr": "categories",
        "keywords": ["category", "categories", "categorie", "catalog", "catalogue"],
        "text_fields": ["nom", "description"],
        "sort_field": "dateCreation",
    },
    "produits": {
        "label_en": "products",
        "label_fr": "produits",
        "keywords": [
            "product", "products", "produit", "produits", "price", "prix",
            "stock", "available", "disponible", "article", "articles",
        ],
        "text_fields": ["nom", "description"],
        "sort_field": "dateCreation",
    },
    "commandes": {
        "label_en": "orders",
        "label_fr": "commandes",
        "keywords": [
            "order", "orders", "commande", "commandes", "sales", "sale",
            "vente", "ventes", "revenue", "revenu", "status", "statut",
            "delivery", "livraison",
        ],
        "text_fields": ["statut", "notes"],
        "sort_field": "dateCommande",
    },
    "lignes_commande": {
        "label_en": "order lines",
        "label_fr": "lignes de commande",
        "keywords": ["line", "lines", "ligne", "lignes", "quantity", "quantite", "unit price", "prix unitaire"],
        "text_fields": [],
        "sort_field": "dateCreation",
    },
    "factures": {
        "label_en": "invoices",
        "label_fr": "factures",
        "keywords": [
            "invoice", "invoices", "facture", "factures", "payment", "payments",
            "paiement", "paid", "unpaid", "impaye", "pending", "en attente",
        ],
        "text_fields": ["numeroFacture", "statutPaiement"],
        "sort_field": "dateEmission",
    },
    "paiements": {
        "label_en": "payments",
        "label_fr": "paiements",
        "keywords": ["payment", "payments", "paiement", "paiements", "reference", "virement", "carte", "cash", "especes"],
        "text_fields": ["reference", "methode"],
        "sort_field": "datePaiement",
    },
    "interactions": {
        "label_en": "interactions",
        "label_fr": "interactions",
        "keywords": [
            "interaction", "interactions", "call", "appel", "meeting", "reunion",
            "email", "follow-up", "suivi", "history", "historique",
        ],
        "text_fields": ["type", "description"],
        "sort_field": "date",
    },
    "rapports": {
        "label_en": "reports",
        "label_fr": "rapports",
        "keywords": ["report", "reports", "rapport", "rapports", "performance"],
        "text_fields": ["type"],
        "sort_field": "dateGeneration",
    },
}


async def _groq_call(messages: List[Dict[str, str]], temperature: float = 0.1) -> str:
    if not settings.GROQ_API_KEY:
        return ""

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1200,
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


def _build_messages(history: List[Dict[str, Any]], system_prompt: str, new_user_message: str) -> List[Dict[str, str]]:
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
    if _contains_any(q, [" how ", " what ", " which ", "who ", "invoice", "order", "client", "sales", "revenue"]):
        return "en"
    return "fr"


def _is_count_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, ["how many", "combien", "number of", "nombre de", "count", "total "])


def _is_unpaid_invoice_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(
        q,
        [
            "unpaid invoice",
            "unpaid invoices",
            "outstanding invoice",
            "outstanding invoices",
            "facture impayee",
            "factures impayees",
            "facture en attente",
            "factures en attente",
        ],
    )


def _is_best_salesperson_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(
        q,
        [
            "best salesperson",
            "top salesperson",
            "best seller",
            "top seller",
            "meilleur vendeur",
            "meilleur commercial",
            "top vendeur",
            "top commercial",
        ],
    )


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
        return [_safe_scalar(item) for item in value[:8]]
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


def _select_collections(question: str, history_text: str, available_collections: List[str]) -> List[str]:
    text = _normalize_text(question)
    if history_text:
        text += " " + _normalize_text(history_text)

    selected = []
    for collection in available_collections:
        hints = COLLECTION_HINTS.get(collection)
        if hints and _contains_any(text, hints["keywords"]):
            selected.append(collection)

    if selected:
        return selected

    preferred = [
        "clients",
        "prospects",
        "produits",
        "commandes",
        "lignes_commande",
        "factures",
        "paiements",
        "interactions",
        "users",
        "categories",
        "rapports",
    ]
    return [name for name in preferred if name in available_collections]


def _build_regex_tokens(question: str) -> List[str]:
    raw_tokens = re.findall(r"[A-Za-z0-9@._-]{3,}", question or "")
    stop_words = {
        "what", "which", "show", "list", "give", "with", "from", "that", "this",
        "combien", "montre", "liste", "avec", "pour", "dans", "the", "les", "des",
        "are", "was", "were", "est", "sont", "invoice", "order", "client", "product",
        "commande", "facture", "produit", "prospect", "user", "employee",
    }
    tokens = []
    for token in raw_tokens:
        normalized = _normalize_text(token)
        if normalized not in stop_words and len(normalized) >= 3:
            tokens.append(token)
    return tokens[:6]


async def _fetch_collection_counts(db, collections: List[str]) -> Dict[str, int]:
    tasks = [db[name].count_documents({}) for name in collections]
    values = await asyncio.gather(*tasks)
    return {name: values[index] for index, name in enumerate(collections)}


async def _fetch_collection_samples(db, collections: List[str]) -> Dict[str, List[Dict[str, Any]]]:
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


async def _find_text_matches(db, collections: List[str], question: str) -> Dict[str, List[Dict[str, Any]]]:
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

        docs = await db[name].find({"$or": clauses}, {"passwordHash": 0}).limit(MAX_TEXT_MATCHES).to_list(MAX_TEXT_MATCHES)
        if docs:
            matches[name] = [_sanitize_document(doc) for doc in docs]

    return matches


def forecast_sales(df: pd.DataFrame, months_ahead: int = MAX_FORECAST_MONTHS) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["month", "predicted_sales"])

    working = df.copy()
    working["month"] = pd.to_datetime(working["month"])
    working["predicted_sales"] = working["total"].rolling(3, min_periods=1).mean()
    recent = working["predicted_sales"].dropna().tail(3).values
    trend = (recent[-1] - recent[0]) / (len(recent) - 1) if len(recent) >= 2 else 0.0
    last_month = working["month"].max()
    last_pred = working["predicted_sales"].iloc[-1]

    future_rows = []
    for index in range(1, months_ahead + 1):
        next_month = last_month + pd.DateOffset(months=index)
        next_pred = last_pred + trend * index
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


async def _compute_verified_metrics(db) -> Dict[str, Any]:
    metrics: Dict[str, Any] = {}

    collection_names = await db.list_collection_names()
    metrics["collection_counts"] = await _fetch_collection_counts(db, collection_names)

    if "commandes" in collection_names:
        order_status_rows = await db["commandes"].aggregate(
            [
                {"$group": {"_id": "$statut", "count": {"$sum": 1}, "total": {"$sum": "$montantTotal"}}},
                {"$sort": {"count": -1, "_id": 1}},
            ]
        ).to_list(20)
        metrics["orders_by_status"] = [
            {"statut": row.get("_id") or "UNKNOWN", "count": row.get("count", 0), "total": round(row.get("total", 0), 2)}
            for row in order_status_rows
        ]

        delivered_sales_rows = await db["commandes"].aggregate(
            [
                {"$match": {"statut": {"$in": ["CONFIRMEE", "LIVREE"]}}},
                {"$group": {"_id": None, "count": {"$sum": 1}, "total": {"$sum": "$montantTotal"}}},
            ]
        ).to_list(1)
        delivered_sales = delivered_sales_rows[0] if delivered_sales_rows else {"count": 0, "total": 0}
        metrics["sales_summary"] = {
            "count": delivered_sales.get("count", 0),
            "total": round(delivered_sales.get("total", 0), 2),
        }

        monthly_rows = await db["commandes"].aggregate(
            [
                {"$project": {"month": {"$dateTrunc": {"date": {"$toDate": "$dateCommande"}, "unit": "month"}}, "total": "$montantTotal"}},
                {"$group": {"_id": "$month", "total": {"$sum": "$total"}}},
                {"$sort": {"_id": 1}},
            ]
        ).to_list(120)
        if monthly_rows:
            monthly_df = pd.DataFrame([{"month": row["_id"], "total": row["total"]} for row in monthly_rows])
            metrics["sales_forecast"] = _safe_records(forecast_sales(monthly_df))

        top_salesperson_rows = await db["commandes"].aggregate(
            [
                {"$match": {"statut": {"$in": ["CONFIRMEE", "LIVREE"]}}},
                {"$group": {"_id": "$userId", "salesCount": {"$sum": 1}, "salesTotal": {"$sum": "$montantTotal"}}},
                {"$sort": {"salesTotal": -1}},
                {"$limit": 5},
                {
                    "$lookup": {
                        "from": "users",
                        "let": {"userId": "$_id"},
                        "pipeline": [
                            {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, {"$toString": "$$userId"}]}}},
                            {"$project": {"nom": 1, "prenom": 1, "email": 1, "role": 1}},
                        ],
                        "as": "user",
                    }
                },
                {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
                {"$project": {"salesCount": 1, "salesTotal": 1, "nom": "$user.nom", "prenom": "$user.prenom", "email": "$user.email", "role": "$user.role"}},
            ]
        ).to_list(5)
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

        top_client_rows = await db["commandes"].aggregate(
            [
                {"$group": {"_id": "$clientId", "orderCount": {"$sum": 1}, "totalSpent": {"$sum": "$montantTotal"}}},
                {"$sort": {"totalSpent": -1}},
                {"$limit": 10},
                {
                    "$lookup": {
                        "from": "clients",
                        "let": {"clientId": "$_id"},
                        "pipeline": [
                            {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, {"$toString": "$$clientId"}]}}},
                            {"$project": {"nom": 1, "prenom": 1, "email": 1, "telephone": 1, "adresse": 1, "type": 1}},
                        ],
                        "as": "client",
                    }
                },
                {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
                {"$project": {"orderCount": 1, "totalSpent": 1, "nom": "$client.nom", "prenom": "$client.prenom", "email": "$client.email", "telephone": "$client.telephone", "adresse": "$client.adresse", "type": "$client.type"}},
            ]
        ).to_list(10)
        metrics["top_clients"] = [
            {
                "nom": f"{row.get('nom', '')} {row.get('prenom', '')}".strip() or "Unknown",
                "email": row.get("email", ""),
                "telephone": row.get("telephone", ""),
                "adresse": row.get("adresse", ""),
                "type": row.get("type", ""),
                "orderCount": row.get("orderCount", 0),
                "totalSpent": round(row.get("totalSpent", 0), 2),
            }
            for row in top_client_rows
        ]

    if "factures" in collection_names:
        invoice_status_rows = await db["factures"].aggregate(
            [
                {"$group": {"_id": "$statutPaiement", "count": {"$sum": 1}, "total": {"$sum": "$montantTotal"}}},
                {"$sort": {"count": -1, "_id": 1}},
            ]
        ).to_list(20)
        metrics["invoices_by_status"] = [
            {"statut": row.get("_id") or "UNKNOWN", "count": row.get("count", 0), "total": round(row.get("total", 0), 2)}
            for row in invoice_status_rows
        ]

        unpaid_rows = await db["factures"].aggregate(
            [
                {"$match": {"statutPaiement": {"$in": ["EN_ATTENTE", "PARTIELLE"]}}},
                {"$group": {"_id": None, "count": {"$sum": 1}, "total": {"$sum": "$montantTotal"}}},
            ]
        ).to_list(1)
        unpaid = unpaid_rows[0] if unpaid_rows else {"count": 0, "total": 0}
        metrics["unpaid_invoices"] = {
            "count": unpaid.get("count", 0),
            "total": round(unpaid.get("total", 0), 2),
        }

    if "lignes_commande" in collection_names:
        top_product_rows = await db["lignes_commande"].aggregate(
            [
                {"$group": {"_id": "$produitId", "quantitySold": {"$sum": "$quantite"}, "revenue": {"$sum": {"$ifNull": ["$sousTotal", {"$multiply": ["$quantite", "$prixUnitaire"]}]}}}},
                {"$sort": {"revenue": -1}},
                {"$limit": 10},
                {
                    "$lookup": {
                        "from": "produits",
                        "let": {"productId": "$_id"},
                        "pipeline": [
                            {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, {"$toString": "$$productId"}]}}},
                            {"$project": {"nom": 1, "description": 1, "prix": 1, "stock": 1, "disponible": 1}},
                        ],
                        "as": "product",
                    }
                },
                {"$unwind": {"path": "$product", "preserveNullAndEmptyArrays": True}},
                {"$project": {"quantitySold": 1, "revenue": 1, "nom": "$product.nom", "description": "$product.description", "prix": "$product.prix", "stock": "$product.stock", "disponible": "$product.disponible"}},
            ]
        ).to_list(10)
        metrics["top_products"] = [
            {
                "nom": row.get("nom") or "Unknown",
                "description": row.get("description", ""),
                "prix": round(row.get("prix", 0), 2),
                "stock": row.get("stock", 0),
                "disponible": row.get("disponible", False),
                "quantitySold": row.get("quantitySold", 0),
                "revenue": round(row.get("revenue", 0), 2),
            }
            for row in top_product_rows
        ]

    return metrics


def _build_system_prompt(language: str) -> str:
    if language == "en":
        return (
            "You are a CRM/ERP assistant. Answer only in English. "
            "Use only the verified database briefing provided by the user message. "
            "Never invent facts, totals, dates, names, or identifiers. "
            "Treat recent_records as samples unless the briefing explicitly says the sample is complete. "
            "If the briefing is insufficient, say that clearly. "
            "Prefer exact numbers and concise reasoning. "
            "Do not mention hidden technical fields such as _id or passwordHash."
        )

    return (
        "Tu es un assistant CRM/ERP. Reponds uniquement en francais. "
        "Utilise uniquement le briefing verifie de la base de donnees fourni dans le message utilisateur. "
        "N'invente jamais de faits, montants, dates, noms ou identifiants. "
        "Considere recent_records comme des echantillons sauf si le briefing dit explicitement que l echantillon est complet. "
        "Si le briefing est insuffisant, dis-le clairement. "
        "Privilegie les nombres exacts et un raisonnement concis. "
        "Ne mentionne pas les champs techniques caches comme _id ou passwordHash."
    )


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
            "sales_summary": metrics.get("sales_summary"),
            "unpaid_invoices": metrics.get("unpaid_invoices"),
            "orders_by_status": metrics.get("orders_by_status"),
            "invoices_by_status": metrics.get("invoices_by_status"),
            "top_salespeople": metrics.get("top_salespeople"),
            "top_clients": metrics.get("top_clients"),
            "top_products": metrics.get("top_products"),
            "sales_forecast": metrics.get("sales_forecast"),
        },
        "matched_records": matches,
        "recent_records": recent_section,
    }

    prefix = "Verified database briefing" if language == "en" else "Briefing verifie de la base de donnees"
    return f"{prefix}:\n{_serialize_for_prompt(briefing)}"


def _fallback_answer(
    question: str,
    language: str,
    collection_counts: Dict[str, int],
    selected_collections: List[str],
    matches: Dict[str, List[Dict[str, Any]]],
    metrics: Dict[str, Any],
) -> str:
    if _is_unpaid_invoice_question(question) and metrics.get("unpaid_invoices"):
        unpaid = metrics["unpaid_invoices"]
        if language == "en":
            return f"There are {unpaid['count']} unpaid or partially paid invoices for a total of {unpaid['total']}."
        return f"Il y a {unpaid['count']} factures impayees ou partiellement payees pour un total de {unpaid['total']}."

    if _is_best_salesperson_question(question) and metrics.get("top_salespeople"):
        top = metrics["top_salespeople"][0]
        if language == "en":
            return f"The best salesperson is {top['nom']} with {top['salesCount']} sales totaling {top['salesTotal']}."
        return f"Le meilleur vendeur est {top['nom']} avec {top['salesCount']} ventes pour un total de {top['salesTotal']}."

    if _is_count_question(question):
        normalized = _normalize_text(question)
        for collection in selected_collections:
            hints = COLLECTION_HINTS.get(collection, {})
            if _contains_any(normalized, hints.get("keywords", [])):
                count = collection_counts.get(collection, 0)
                label = hints.get("label_en" if language == "en" else "label_fr", collection)
                if language == "en":
                    return f"There are {count} {label} in the database."
                return f"Il y a {count} {label} dans la base de donnees."

    if matches:
        first_collection = next(iter(matches))
        records = matches[first_collection][:3]
        if language == "en":
            return f"I found matching records in {first_collection}: {json.dumps(records, ensure_ascii=True)}"
        return f"J'ai trouve des enregistrements correspondants dans {first_collection} : {json.dumps(records, ensure_ascii=True)}"

    summaries = []
    for collection in selected_collections[:4]:
        count = collection_counts.get(collection, 0)
        label = COLLECTION_HINTS.get(collection, {}).get("label_en" if language == "en" else "label_fr", collection)
        summaries.append(f"{label}: {count}")

    if language == "en":
        return f"I could not verify a more specific answer yet. Available verified counts: {', '.join(summaries)}."
    return f"Je ne peux pas encore verifier une reponse plus precise. Comptes verifies disponibles : {', '.join(summaries)}."


@router.post("/assistant/sales_forecast")
async def sales_forecast(
    payload: Dict[str, Any],
    chart: Optional[bool] = Query(None, include_in_schema=False),
    db=Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE])),
):
    del chart
    del current_user

    question = str(payload.get("question") or "").strip()
    history = payload.get("history") or []
    language = _detect_language(payload.get("language"), question)

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    q_lower = _normalize_text(question)
    if q_lower in INSTANT_REPLIES[language]:
        return {
            "answer": INSTANT_REPLIES[language][q_lower],
            "chart": None,
            "predictions": [],
            "top_products": [],
            "top_clients": [],
        }

    history_text = " ".join(str(msg.get("content", ""))[:200] for msg in _strip_charts(history[-6:]))
    available_collections = await db.list_collection_names()
    selected_collections = _select_collections(question, history_text, available_collections)

    collection_counts = await _fetch_collection_counts(db, available_collections)
    collection_samples = await _fetch_collection_samples(db, selected_collections)
    text_matches = await _find_text_matches(db, selected_collections, question)
    metrics = await _compute_verified_metrics(db)

    user_message_with_data = _build_data_briefing(
        question=question,
        language=language,
        collection_counts=collection_counts,
        selected_collections=selected_collections,
        samples=collection_samples,
        matches=text_matches,
        metrics=metrics,
    )

    messages = _build_messages(history, _build_system_prompt(language), user_message_with_data)
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
