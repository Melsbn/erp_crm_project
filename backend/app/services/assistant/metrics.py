from typing import Any, Dict

import pandas as pd

from .data import _fetch_collection_counts
from .forecasting import _safe_records, forecast_sales


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
