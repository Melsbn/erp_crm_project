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
    return {
        "sales":        any(w in q for w in ["vente", "ventes", "chiffre", "prévision", "forecast", "revenu", "revenus", "mois", "mensuel", "croissance", "pourcentage", "ca ", "c.a"]),
        "products":     any(w in q for w in ["produit", "produits", "article", "articles", "stock", "prix", "catalogue", "disponible", "populaire"]),
        "clients":      any(w in q for w in ["client", "clients", "acheteur", "dépensé", "depensé", "trie", "montant", "email", "contact", "telephone", "adresse", "meilleur", "qui ", "son ", "leur "]),
        "orders":       any(w in q for w in ["commande", "commandes", "livraison", "livré", "annulé", "confirmé", "brouillon", "en cours"]),
        "invoices":     any(w in q for w in ["facture", "factures", "paiement", "paiements", "impayé", "retard", "réglé", "montant dû", "en attente"]),
        "prospects":    any(w in q for w in ["prospect", "prospects", "lead", "leads", "pipeline", "converti", "qualifié", "nouveau prospect", "contacté"]),
        "interactions": any(w in q for w in ["interaction", "interactions", "appel", "email envoyé", "réunion", "rendez-vous", "historique", "suivi"]),
        "employees":    any(w in q for w in ["employé", "employés", "utilisateur", "utilisateurs", "vendeur", "vendeurs", "équipe", "performance"]),
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
            "month": {"$dateTrunc": {"date": {"$toDate": "$dateCommande"}, "unit": "month"}},
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
        {"$addFields": {"produitIdObj": {"$cond": {"if": {"$eq": [{"$type": "$_id"}, "objectId"]}, "then": "$_id", "else": {"$toObjectId": "$_id"}}}}},
        {"$lookup": {"from": "produits", "localField": "produitIdObj", "foreignField": "_id", "as": "produit"}},
        {"$unwind": {"path": "$produit", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "predicted_revenue": 1,
            "nom":         {"$ifNull": ["$produit.nom", "Produit inconnu"]},
            "description": {"$ifNull": ["$produit.description", ""]},
            "prix":        {"$ifNull": ["$produit.prix", 0]},
            "stock":       {"$ifNull": ["$produit.stock", 0]},
            "disponible":  {"$ifNull": ["$produit.disponible", False]},
        }},
    ]


def _pipeline_clients():
    return [
        {"$sort": {"dateCommande": -1}},
        {"$limit": MAX_DOCS},
        {"$group": {"_id": "$clientId", "total_spent": {"$sum": "$montantTotal"}, "nb_commandes": {"$sum": 1}}},
        {"$sort": {"total_spent": -1}},
        {"$limit": 10},
        {"$addFields": {"clientIdObj": {"$cond": {"if": {"$eq": [{"$type": "$_id"}, "objectId"]}, "then": "$_id", "else": {"$toObjectId": "$_id"}}}}},
        {"$lookup": {"from": "clients", "localField": "clientIdObj", "foreignField": "_id", "as": "client"}},
        {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "total_spent": 1, "nb_commandes": 1,
            "nom":       {"$ifNull": ["$client.nom", "Inconnu"]},
            "prenom":    {"$ifNull": ["$client.prenom", ""]},
            "email":     {"$ifNull": ["$client.email", ""]},
            "telephone": {"$ifNull": ["$client.telephone", ""]},
            "adresse":   {"$ifNull": ["$client.adresse", ""]},
            "type":      {"$ifNull": ["$client.type", ""]},
        }},
    ]


def _pipeline_orders():
    return [
        {"$sort": {"dateCommande": -1}},
        {"$limit": 50},
        {"$addFields": {"clientIdObj": {"$cond": {"if": {"$eq": [{"$type": "$clientId"}, "objectId"]}, "then": "$clientId", "else": {"$toObjectId": "$clientId"}}}}},
        {"$lookup": {"from": "clients", "localField": "clientIdObj", "foreignField": "_id", "as": "client"}},
        {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "dateCommande": 1,
            "statut":       1,
            "montantTotal": 1,
            "notes":        1,
            "clientNom":    {"$ifNull": [{"$concat": ["$client.nom", " ", "$client.prenom"]}, "Inconnu"]},
        }},
    ]


def _pipeline_invoices():
    return [
        {"$sort": {"dateEmission": -1}},
        {"$limit": 50},
        {"$addFields": {"clientIdObj": {"$cond": {"if": {"$eq": [{"$type": "$clientId"}, "objectId"]}, "then": "$clientId", "else": {"$toObjectId": "$clientId"}}}}},
        {"$lookup": {"from": "clients", "localField": "clientIdObj", "foreignField": "_id", "as": "client"}},
        {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "numeroFacture":  1,
            "dateEmission":   1,
            "montantTotal":   1,
            "statutPaiement": 1,
            "datePaiement":   1,
            "clientNom":      {"$ifNull": [{"$concat": ["$client.nom", " ", "$client.prenom"]}, "Inconnu"]},
        }},
    ]


def _pipeline_prospects():
    return [
        {"$sort": {"dateCreation": -1}},
        {"$limit": 50},
        {"$project": {
            "nom":       1,
            "prenom":    1,
            "email":     1,
            "telephone": 1,
            "entreprise":1,
            "statut":    1,
        }},
    ]


def _pipeline_interactions():
    return [
        {"$sort": {"date": -1}},
        {"$limit": 50},
        {"$addFields": {"clientIdObj": {"$cond": {"if": {"$eq": [{"$type": "$clientId"}, "objectId"]}, "then": "$clientId", "else": {"$toObjectId": {"$ifNull": ["$clientId", "000000000000000000000000"]}}}}}},
        {"$lookup": {"from": "clients", "localField": "clientIdObj", "foreignField": "_id", "as": "client"}},
        {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "type":        1,
            "description": 1,
            "date":        1,
            "clientNom":   {"$ifNull": [{"$concat": ["$client.nom", " ", "$client.prenom"]}, "Inconnu"]},
        }},
    ]


def _pipeline_employees():
    return [
        {"$match": {"actif": True}},
        {"$project": {
            "nom":    1,
            "prenom": 1,
            "email":  1,
            "role":   1,
            "actif":  1,
        }},
        {"$limit": 50},
    ]


# ================================================================
# Fallback formatter
# ================================================================

def _format_fallback(question: str, data_parts: List[str]) -> str:
    if not data_parts:
        return "Je suis là pour vous aider. Posez-moi une question sur vos données CRM/ERP."
    return f"Voici les données disponibles pour : « {question} »\n\n" + "\n".join(data_parts)


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
    history = payload.get("history") or []
    language = "en" if str(payload.get("language") or "").lower().startswith("en") else "fr"

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    instant_replies = {
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

    system_prompt = (
        "You are an AI assistant integrated into a professional CRM/ERP. "
        "You answer only in English, concisely and naturally. "
        "You use the provided data to answer questions precisely. "
        "You never invent data. "
        "You never show technical identifiers such as ObjectId or _id. "
        "When listing clients, include their full name, email, phone number, and total spent when available. "
        "When listing invoices, clearly state the payment status. "
        "If the data is insufficient, say so clearly."
        if language == "en"
        else
        "Tu es un assistant IA integre dans un CRM/ERP professionnel. "
        "Tu reponds uniquement en francais, de maniere concise et naturelle. "
        "Tu utilises les donnees fournies pour repondre precisement aux questions. "
        "Tu n'inventes jamais de donnees. "
        "Tu ne montres jamais d'identifiants techniques (ObjectId, _id). "
        "Quand tu listes des clients, tu inclus leur nom complet, email, telephone et montant depense si disponibles. "
        "Quand tu listes des factures, tu indiques le statut de paiement clairement. "
        "Si les donnees ne permettent pas de repondre, dis-le clairement."
    )

    q_lower = question.lower().strip()
    if q_lower in instant_replies[language]:
        return {
            "answer": instant_replies[language][q_lower],
            "chart": None,
            "predictions": [],
            "top_products": [],
            "top_clients": [],
        }

    history_text = " ".join(
        m.get("content", "")[:200]
        for m in _strip_charts(history[-6:])
    )
    intent = _detect_intent(question, history_text)
    is_general = not any([
        intent["sales"], intent["products"], intent["clients"],
        intent["orders"], intent["invoices"], intent["prospects"],
        intent["interactions"], intent["employees"],
    ])

    if is_general:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ]
        answer = await _groq_call(messages)
        if not answer:
            answer = (
                "I'm here to help. Ask me a question about your sales, clients, invoices, products, prospects, or interactions."
                if language == "en"
                else
                "Je suis la pour vous aider. Posez-moi une question sur vos ventes, clients, factures, produits, prospects ou interactions."
            )
        return {"answer": answer, "chart": None, "predictions": [], "top_products": [], "top_clients": []}

    tasks = {}
    if intent["sales"]:
        tasks["sales"] = db[CommandeModel.collection].aggregate(_pipeline_sales()).to_list(MAX_DOCS)
    if intent["products"]:
        tasks["products"] = db[LigneCommandeModel.collection].aggregate(_pipeline_prod()).to_list(5)
    if intent["clients"]:
        tasks["clients"] = db[CommandeModel.collection].aggregate(_pipeline_clients()).to_list(10)
    if intent["orders"]:
        tasks["orders"] = db[CommandeModel.collection].aggregate(_pipeline_orders()).to_list(50)
    if intent["invoices"]:
        tasks["invoices"] = db["factures"].aggregate(_pipeline_invoices()).to_list(50)
    if intent["prospects"]:
        tasks["prospects"] = db["prospects"].find({}, {"_id": 0}).to_list(50)
    if intent["interactions"]:
        tasks["interactions"] = db["interactions"].aggregate(_pipeline_interactions()).to_list(50)
    if intent["employees"]:
        tasks["employees"] = db["users"].aggregate(_pipeline_employees()).to_list(50)

    results = dict(zip(tasks.keys(), await asyncio.gather(*tasks.values())))

    data_parts = []
    predictions_preview = []
    top_prod = []
    top_clients = []

    if results.get("sales"):
        df_sales = pd.DataFrame([{"month": d["_id"], "total": d["total"]} for d in results["sales"]])
        forecast_df = forecast_sales(df_sales)
        predictions_preview = safe_records(forecast_df)
        data_parts.append(f'{"Sales forecast" if language == "en" else "Previsions de ventes"}: {predictions_preview}')

    if results.get("products"):
        top_prod = [
            {
                "nom": d.get("nom", "Unknown" if language == "en" else "Inconnu"),
                "description": d.get("description", ""),
                "prix": d.get("prix", 0),
                "stock": d.get("stock", 0),
                "disponible": d.get("disponible", False),
                "predicted_revenue": round(d.get("predicted_revenue", 0), 2),
            }
            for d in results["products"]
        ]
        data_parts.append(f'{"Products (name, price, stock, available, revenue)" if language == "en" else "Produits (nom, prix, stock, disponible, revenu)"}: {top_prod}')

    if results.get("clients"):
        top_clients = [
            {
                "nom": f"{d.get('nom', '')} {d.get('prenom', '')}".strip() or ("Unknown" if language == "en" else "Inconnu"),
                "email": d.get("email", ""),
                "telephone": d.get("telephone", ""),
                "adresse": d.get("adresse", ""),
                "type": d.get("type", ""),
                "total_spent": round(d.get("total_spent", 0), 2),
                "nb_commandes": d.get("nb_commandes", 0),
            }
            for d in results["clients"]
        ]
        data_parts.append(f'{"Clients (name, email, phone, address, type, total_spent, orders)" if language == "en" else "Clients (nom, email, telephone, adresse, type, total_spent, nb_commandes)"}: {top_clients}')

    if results.get("orders"):
        orders = [
            {
                "client": d.get("clientNom", "Unknown" if language == "en" else "Inconnu"),
                "date": str(d.get("dateCommande", ""))[:10],
                "statut": d.get("statut", ""),
                "montant": d.get("montantTotal", 0),
                "notes": d.get("notes", ""),
            }
            for d in results["orders"]
        ]
        data_parts.append(f'{"Recent orders (client, date, status, amount)" if language == "en" else "Commandes recentes (client, date, statut, montant)"}: {orders}')

    if results.get("invoices"):
        invoices = [
            {
                "numero": d.get("numeroFacture", ""),
                "client": d.get("clientNom", "Unknown" if language == "en" else "Inconnu"),
                "date": str(d.get("dateEmission", ""))[:10],
                "montant": d.get("montantTotal", 0),
                "statut": d.get("statutPaiement", ""),
                "payeLe": str(d.get("datePaiement", ""))[:10] if d.get("datePaiement") else ("Unpaid" if language == "en" else "Non payee"),
            }
            for d in results["invoices"]
        ]
        data_parts.append(f'{"Invoices (number, client, date, amount, status, paid_on)" if language == "en" else "Factures (numero, client, date, montant, statut, payeLe)"}: {invoices}')

    if results.get("prospects"):
        prospects = [
            {
                "nom": f"{d.get('nom', '')} {d.get('prenom', '')}".strip(),
                "email": d.get("email", ""),
                "telephone": d.get("telephone", ""),
                "entreprise": d.get("entreprise", ""),
                "statut": d.get("statut", ""),
            }
            for d in results["prospects"]
        ]
        data_parts.append(f'{"Prospects (name, email, company, status)" if language == "en" else "Prospects (nom, email, entreprise, statut)"}: {prospects}')

    if results.get("interactions"):
        interactions = [
            {
                "type": d.get("type", ""),
                "client": d.get("clientNom", "Unknown" if language == "en" else "Inconnu"),
                "date": str(d.get("date", ""))[:10],
                "description": d.get("description", "")[:200],
            }
            for d in results["interactions"]
        ]
        data_parts.append(f'{"Recent interactions (type, client, date, description)" if language == "en" else "Interactions recentes (type, client, date, description)"}: {interactions}')

    if results.get("employees"):
        employees = [
            {
                "nom": f"{d.get('nom', '')} {d.get('prenom', '')}".strip(),
                "email": d.get("email", ""),
                "role": d.get("role", ""),
                "actif": d.get("actif", False),
            }
            for d in results["employees"]
        ]
        data_parts.append(f'{"Employees (name, email, role)" if language == "en" else "Employes (nom, email, role)"}: {employees}')

    user_message_with_data = question
    if data_parts:
        user_message_with_data += ("\n\nAvailable data:\n" if language == "en" else "\n\nDonnees disponibles:\n") + "\n".join(data_parts)

    messages = _build_messages(history, system_prompt, user_message_with_data)
    explanation = await _groq_call(messages)

    if not explanation:
        if not data_parts:
            explanation = (
                "I'm here to help. Ask me a question about your CRM/ERP data."
                if language == "en"
                else
                "Je suis la pour vous aider. Posez-moi une question sur vos donnees CRM/ERP."
            )
        else:
            explanation = (
                f'Here is the available data for: "{question}"\n\n' if language == "en" else f'Voici les donnees disponibles pour : "{question}"\n\n'
            ) + "\n".join(data_parts)

    return {
        "answer": explanation,
        "chart": None,
        "predictions": predictions_preview,
        "top_products": top_prod,
        "top_clients": top_clients,
    }
