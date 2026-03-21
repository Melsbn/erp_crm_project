from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import Any, Dict, List, Optional
import pandas as pd
import httpx
import asyncio

from app.core.database import get_database
from app.core.config import settings
from app.models import CommandeModel, LigneCommandeModel
from app.api.deps import require_roles, ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE

router = APIRouter()
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_FORECAST_MONTHS = 3
MAX_DOCS = 2000
MAX_HISTORY_TURNS = 8

INSTANT_REPLIES = {
    "merci":         "De rien ! N'hésitez pas si vous avez d'autres questions.",
    "super":         "Ravi de pouvoir vous aider !",
    "ok":            "D'accord ! Autre chose ?",
    "bien":          "Tant mieux ! Je suis là si vous avez d'autres questions.",
    "parfait":       "Parfait ! N'hésitez pas si vous avez d'autres questions.",
    "au revoir":     "Au revoir ! Bonne journée.",
    "bonne journée": "Merci, bonne journée à vous aussi !",
    "bonjour":       "Bonjour ! Comment puis-je vous aider ?",
    "bonsoir":       "Bonsoir ! Comment puis-je vous aider ?",
    "salut":         "Salut ! Comment puis-je vous aider ?",
    "stp":           "Bien sûr, je vous écoute.",
    "svp":           "Bien sûr, je vous écoute.",
}


# ================================================================
# Groq
# ================================================================

async def _groq_call(messages: List[Dict], temperature: float = 0.3) -> str:
    if not settings.GROQ_API_KEY:
        return ""
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1024,
    }
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(GROQ_API_URL, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"Groq attempt {attempt} failed: {e}")
            if attempt < 2:
                await asyncio.sleep(1.0)
    return ""


# ================================================================
# Intent detection
# ================================================================

def _detect_intent(question: str, history_text: str) -> Dict[str, bool]:
    q = question.lower() + " " + history_text.lower()
    wants_sales    = any(w in q for w in ["vente", "ventes", "chiffre", "prévision", "forecast", "revenu", "revenus", "mois", "mensuel", "croissance", "pourcentage", "ca ", "c.a"])
    wants_products = any(w in q for w in ["produit", "produits", "article", "articles", "stock", "populaire"])
    wants_clients  = any(w in q for w in ["client", "clients", "acheteur", "commande", "commandes", "dépensé", "depensé", "trie", "montant", "email", "contact", "telephone", "adresse", "meilleur", "qui ", "son ", "leur "])
    return {
        "sales":    wants_sales,
        "products": wants_products,
        "clients":  wants_clients,
        "general":  not (wants_sales or wants_products or wants_clients),
    }


# ================================================================
# History helpers
# ================================================================

def _trim_history(history: List[Dict]) -> List[Dict]:
    max_items = MAX_HISTORY_TURNS * 2
    return history[-max_items:] if len(history) > max_items else history


def _strip_charts(history: List[Dict]) -> List[Dict]:
    cleaned = []
    for msg in history:
        content = msg.get("content", "")
        if isinstance(content, str) and "data:image" in content:
            content = "[graphique omis]"
        cleaned.append({**msg, "content": content})
    return cleaned


def _build_messages(history: List[Dict], system_prompt: str, new_user_message: str) -> List[Dict]:
    messages = [{"role": "system", "content": system_prompt}]
    trimmed = _trim_history(_strip_charts(history[1:]))
    for msg in trimmed:
        role = "assistant" if msg.get("role") == "assistant" else "user"
        content = msg.get("content", "").strip()
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": new_user_message})
    return messages


# ================================================================
# Forecast computation
# ================================================================

def forecast_sales(df: pd.DataFrame, months_ahead: int = MAX_FORECAST_MONTHS) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["month", "predicted_sales"])
    df = df.copy()
    df["month"] = pd.to_datetime(df["month"])
    df["predicted_sales"] = df["total"].rolling(3, min_periods=1).mean()
    recent = df["predicted_sales"].dropna().tail(3).values
    trend = (recent[-1] - recent[0]) / (len(recent) - 1) if len(recent) >= 2 else 0.0
    last_month = df["month"].max()
    last_pred = df["predicted_sales"].iloc[-1]
    future_rows = []
    for i in range(1, months_ahead + 1):
        next_month = last_month + pd.DateOffset(months=i)
        next_pred = last_pred + trend * i
        future_rows.append({"month": next_month, "predicted_sales": round(next_pred, 2)})
    if future_rows:
        df = pd.concat([df, pd.DataFrame(future_rows)], ignore_index=True)
    df = df[["month", "predicted_sales"]].copy()
    df["predicted_sales"] = df["predicted_sales"].fillna(0).round(2)
    return df


# ================================================================
# Serialization
# ================================================================

def safe_records(df: pd.DataFrame) -> List[Dict]:
    records = []
    for row in df.to_dict(orient="records"):
        safe_row = {}
        for k, v in row.items():
            if isinstance(v, (pd.Timestamp, datetime)):
                safe_row[k] = v.isoformat()
            elif isinstance(v, float) and pd.isna(v):
                safe_row[k] = None
            else:
                safe_row[k] = v
        records.append(safe_row)
    return records


# ================================================================
# MongoDB pipelines
# ================================================================

def _pipeline_sales():
    return [
        {"$sort": {"dateCommande": -1}},
        {"$limit": MAX_DOCS},
        {"$project": {
            "month": {
                "$dateTrunc": {
                    "date": {"$toDate": "$dateCommande"},
                    "unit": "month",
                }
            },
            "total": "$montantTotal",
        }},
        {"$group": {"_id": "$month", "total": {"$sum": "$total"}}},
        {"$sort": {"_id": 1}},
    ]


def _pipeline_prod():
    return [
        {"$sort": {"dateCommande": -1}},
        {"$limit": MAX_DOCS},
        {"$project": {
            "produitId": 1,
            "revenue": {"$multiply": ["$quantite", "$prixUnitaire"]},
        }},
        {"$group": {"_id": "$produitId", "predicted_revenue": {"$sum": "$revenue"}}},
        {"$sort": {"predicted_revenue": -1}},
        {"$limit": 5},
        {"$addFields": {
            "produitIdObj": {
                "$cond": {
                    "if":   {"$eq": [{"$type": "$_id"}, "objectId"]},
                    "then": "$_id",
                    "else": {"$toObjectId": "$_id"},
                }
            }
        }},
        {"$lookup": {
            "from":         "produits",
            "localField":   "produitIdObj",
            "foreignField": "_id",
            "as":           "produit",
        }},
        {"$unwind": {"path": "$produit", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "predicted_revenue": 1,
            "nom":         {"$ifNull": ["$produit.nom", "Produit inconnu"]},
            "description": {"$ifNull": ["$produit.description", ""]},
        }},
    ]


def _pipeline_clients():
    return [
        {"$sort": {"dateCommande": -1}},
        {"$limit": MAX_DOCS},
        {"$group": {
            "_id":          "$clientId",
            "total_spent":  {"$sum": "$montantTotal"},
            "nb_commandes": {"$sum": 1},
        }},
        {"$sort": {"total_spent": -1}},
        {"$limit": 10},
        {"$addFields": {
            "clientIdObj": {
                "$cond": {
                    "if":   {"$eq": [{"$type": "$_id"}, "objectId"]},
                    "then": "$_id",
                    "else": {"$toObjectId": "$_id"},
                }
            }
        }},
        {"$lookup": {
            "from":         "clients",
            "localField":   "clientIdObj",
            "foreignField": "_id",
            "as":           "client",
        }},
        {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "total_spent":  1,
            "nb_commandes": 1,
            "nom":       {"$ifNull": ["$client.nom", "Inconnu"]},
            "prenom":    {"$ifNull": ["$client.prenom", ""]},
            "email":     {"$ifNull": ["$client.email", ""]},
            "telephone": {"$ifNull": ["$client.telephone", ""]},
            "adresse":   {"$ifNull": ["$client.adresse", ""]},
        }},
    ]


# ================================================================
# Fallback formatter
# ================================================================

def _format_fallback(
    question: str,
    predictions: List[Dict],
    top_prod: List[Dict],
    top_clients: List[Dict],
) -> str:
    lines = [f"Voici les données disponibles pour : « {question} »\n"]
    if predictions:
        lines.append("**Prévisions de ventes :**")
        for p in predictions[-3:]:
            lines.append(f"- {str(p.get('month', ''))[:7]} : {p.get('predicted_sales', 0)} €")
    if top_prod:
        lines.append("\n**Top produits :**")
        for i, p in enumerate(top_prod, 1):
            lines.append(f"{i}. {p.get('nom', 'Inconnu')} — {p.get('predicted_revenue', 0)} €")
    if top_clients:
        lines.append("\n**Top clients :**")
        for i, c in enumerate(top_clients, 1):
            name = f"{c.get('nom', '')} {c.get('prenom', '')}".strip() or "Inconnu"
            email = c.get("email", "")
            lines.append(
                f"{i}. {name} — {c.get('total_spent', 0)} €"
                f" ({c.get('nb_commandes', 0)} commandes)"
                f"{' — ' + email if email else ''}"
            )
    return "\n".join(lines)


# ================================================================
# Main endpoint
# ================================================================

@router.post("/assistant/sales_forecast")
async def sales_forecast(
    payload: Dict[str, Any],
    chart: Optional[bool] = Query(None, include_in_schema=False),
    db=Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE])),
):
    question = (payload.get("question") or "").strip()
    history  = payload.get("history") or []

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    # ── 1. Instant replies ─────────────────────────────────────────
    q_lower = question.lower().strip()
    if q_lower in INSTANT_REPLIES:
        return {"answer": INSTANT_REPLIES[q_lower], "chart": None, "predictions": [], "top_products": [], "top_clients": []}

    system_prompt = (
        "Tu es un assistant IA intégré dans un CRM/ERP professionnel. "
        "Tu réponds uniquement en français, de manière concise et naturelle. "
        "Tu utilises les données fournies pour répondre précisément aux questions. "
        "Tu n'inventes jamais de données. "
        "Tu ne montres jamais d'identifiants techniques (ObjectId, _id). "
        "Quand tu listes des clients, tu inclus toujours leur nom complet, email, "
        "téléphone et montant dépensé si disponibles. "
        "Si les données ne permettent pas de répondre, dis-le clairement."
    )

    # ── 2. Intent detection ────────────────────────────────────────
    history_text = " ".join(
        m.get("content", "")[:200]
        for m in _strip_charts(history[-6:])
    )
    intent = _detect_intent(question, history_text)

    # ── 3. General question ────────────────────────────────────────
    if intent["general"]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": question},
        ]
        answer = await _groq_call(messages)
        if not answer:
            answer = "Je suis là pour vous aider. Posez-moi une question sur vos ventes, clients ou produits."
        return {"answer": answer, "chart": None, "predictions": [], "top_products": [], "top_clients": []}

    # ── 4. DB queries ──────────────────────────────────────────────
    tasks = {}
    if intent["sales"]:
        tasks["sales"] = db[CommandeModel.collection].aggregate(_pipeline_sales()).to_list(MAX_DOCS)
    if intent["products"]:
        tasks["products"] = db[LigneCommandeModel.collection].aggregate(_pipeline_prod()).to_list(5)
    if intent["clients"]:
        tasks["clients"] = db[CommandeModel.collection].aggregate(_pipeline_clients()).to_list(10)

    results = dict(zip(tasks.keys(), await asyncio.gather(*tasks.values())))

    sales_raw   = results.get("sales", [])
    prod_raw    = results.get("products", [])
    clients_raw = results.get("clients", [])

    data_parts = []
    predictions_preview = []
    top_prod = []
    top_clients = []

    if sales_raw:
        df_sales = pd.DataFrame([{"month": d["_id"], "total": d["total"]} for d in sales_raw])
        forecast_df = forecast_sales(df_sales)
        predictions_preview = safe_records(forecast_df)
        data_parts.append(f"Prévisions de ventes (mois, montant prédit): {predictions_preview}")

    if prod_raw:
        top_prod = [
            {
                "nom":               d.get("nom", "Produit inconnu"),
                "description":       d.get("description", ""),
                "predicted_revenue": round(d["predicted_revenue"], 2),
            }
            for d in prod_raw
        ]
        data_parts.append(f"Top produits (nom, revenu): {top_prod}")

    if clients_raw:
        top_clients = [
            {
                "nom":          f"{d.get('nom', '')} {d.get('prenom', '')}".strip() or "Client inconnu",
                "email":        d.get("email", ""),
                "telephone":    d.get("telephone", ""),
                "adresse":      d.get("adresse", ""),
                "total_spent":  round(d["total_spent"], 2),
                "nb_commandes": d.get("nb_commandes", 0),
            }
            for d in clients_raw
        ]
        data_parts.append(
            f"Données clients complètes (nom, email, telephone, adresse, total_spent, nb_commandes): {top_clients}"
        )

    user_message_with_data = question
    if data_parts:
        user_message_with_data += "\n\nDonnées disponibles:\n" + "\n".join(data_parts)

    messages = _build_messages(history, system_prompt, user_message_with_data)

    # ── 5. Groq call — no charts ───────────────────────────────────
    explanation = await _groq_call(messages)

    # ── 6. Fallback ────────────────────────────────────────────────
    if not explanation:
        explanation = _format_fallback(question, predictions_preview, top_prod, top_clients)

    return {
        "answer":       explanation,
        "chart":        None,
        "predictions":  predictions_preview,
        "top_products": top_prod,
        "top_clients":  top_clients,
    }