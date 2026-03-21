from fastapi import APIRouter, Depends
from typing import List
from datetime import datetime, timedelta
from bson import ObjectId
from app.core.database import get_database
from app.schemas import (
    KPIs, VenteMensuelle, ProduitPopulaire, PerformanceEmploye,
    UserResponse, ProduitResponse
)
from app.models import (
    CommandeModel, ClientModel, ProspectModel,
    LigneCommandeModel, ProduitModel, UserModel,
    serialize_doc
)
from app.api.deps import require_roles, ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE, is_employee

router = APIRouter()


# ---------------- KPIs ----------------
@router.get("/kpis", response_model=KPIs)
async def get_kpis(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    order_query = {}
    client_query = {}
    prospect_query = {}
    if is_employee(current_user):
        order_query = {"userId": current_user.get("id")}
        client_query = {"userId": current_user.get("id")}
        prospect_query = {"userId": current_user.get("id")}

    total_ventes = await db[CommandeModel.collection].count_documents(order_query)
    total_clients = await db[ClientModel.collection].count_documents(client_query)
    total_prospects = await db[ProspectModel.collection].count_documents(prospect_query)
    total_commandes = await db[CommandeModel.collection].count_documents(order_query)

    commandes_en_cours_query = {"statut": {"$in": ["BROUILLON", "CONFIRMEE"]}}
    if is_employee(current_user):
        commandes_en_cours_query["userId"] = current_user.get("id")

    commandes_en_cours = await db[CommandeModel.collection].count_documents(commandes_en_cours_query)

    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)

    pipeline_month = [
        {"$match": {"dateCommande": {"$gte": start_of_month.isoformat()}, **order_query}},
        {"$group": {"_id": None, "total": {"$sum": "$montantTotal"}}}
    ]

    result_month = await db[CommandeModel.collection].aggregate(pipeline_month).to_list(1)
    revenu_mois = result_month[0]["total"] if result_month else 0

    start_of_year = datetime(now.year, 1, 1)

    pipeline_year = [
        {"$match": {"dateCommande": {"$gte": start_of_year.isoformat()}, **order_query}},
        {"$group": {"_id": None, "total": {"$sum": "$montantTotal"}}}
    ]

    result_year = await db[CommandeModel.collection].aggregate(pipeline_year).to_list(1)
    revenu_annee = result_year[0]["total"] if result_year else 0

    pipeline_avg = [
        {"$match": order_query},
        {"$group": {"_id": None, "avg": {"$avg": "$montantTotal"}}}
    ]

    result_avg = await db[CommandeModel.collection].aggregate(pipeline_avg).to_list(1)
    panier_moyen = result_avg[0]["avg"] if result_avg else 0

    return KPIs(
        totalVentes=total_ventes,
        totalClients=total_clients,
        totalProspects=total_prospects,
        totalCommandes=total_commandes,
        commandesEnCours=commandes_en_cours,
        revenuMois=revenu_mois,
        revenuAnnee=revenu_annee,
        panierMoyen=panier_moyen
    )


# ---------------- MONTHLY SALES ----------------
@router.get("/ventes-mensuelles", response_model=List[VenteMensuelle])
async def get_monthly_sales(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    now = datetime.utcnow()
    twelve_months_ago = now - timedelta(days=365)

    pipeline = [
        {"$match": {"dateCommande": {"$gte": twelve_months_ago.isoformat()}}},
        {
            "$group": {
                "_id": {"$substr": ["$dateCommande", 0, 7]},
                "montant": {"$sum": "$montantTotal"},
                "nombre": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]

    if is_employee(current_user):
        pipeline[0]["$match"]["userId"] = current_user.get("id")

    results = await db[CommandeModel.collection].aggregate(pipeline).to_list(100)

    return [
        VenteMensuelle(
            mois=r["_id"],
            montant=r["montant"],
            nombre=r["nombre"]
        )
        for r in results
    ]


# ---------------- POPULAR PRODUCTS ----------------
@router.get("/produits-populaires", response_model=List[ProduitPopulaire])
async def get_popular_products(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    match_stage = {}
    if is_employee(current_user):
        employee_orders = await db[CommandeModel.collection].find(
            {"userId": current_user.get("id")},
            {"_id": 1}
        ).to_list(5000)
        employee_order_ids = [str(o["_id"]) for o in employee_orders]
        match_stage = {"commandeId": {"$in": employee_order_ids}}

    pipeline = [
        {"$match": match_stage},
        {"$group": {
            "_id": "$produitId",
            "quantiteVendue": {"$sum": "$quantite"},
            "revenu": {"$sum": "$sousTotal"}
        }},
        {"$sort": {"quantiteVendue": -1}},
        {"$limit": 10}
    ]

    results = await db[LigneCommandeModel.collection].aggregate(pipeline).to_list(100)

    popular_products = []
    for r in results:
        if ObjectId.is_valid(r["_id"]):
            product = await db[ProduitModel.collection].find_one({"_id": ObjectId(r["_id"])})
            if product:
                popular_products.append(
                    ProduitPopulaire(
                        produit=ProduitResponse(**serialize_doc(product)),
                        quantiteVendue=r["quantiteVendue"],
                        revenu=r["revenu"]
                    )
                )

    return popular_products


# ---------------- EMPLOYEE PERFORMANCE ----------------
@router.get("/performance-employes", response_model=List[PerformanceEmploye])
async def get_employee_performance(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    sales_statuses = ["CONFIRMEE", "LIVREE"]
    if is_employee(current_user):
        pipeline = [
            {"$match": {"userId": current_user.get("id"), "statut": {"$in": sales_statuses}}},
            {"$group": {
                "_id": "$userId",
                "nombreVentes": {"$sum": 1},
                "montantTotal": {"$sum": "$montantTotal"}
            }}
        ]
        results = await db[CommandeModel.collection].aggregate(pipeline).to_list(10)
    else:
        pipeline = [
            {"$match": {"statut": {"$in": sales_statuses}}},
            {"$group": {
                "_id": "$userId",
                "nombreVentes": {"$sum": 1},
                "montantTotal": {"$sum": "$montantTotal"}
            }},
            {"$sort": {"montantTotal": -1}}
        ]
        results = await db[CommandeModel.collection].aggregate(pipeline).to_list(100)

    performances = []
    for r in results:
        if ObjectId.is_valid(r["_id"]):
            user = await db[UserModel.collection].find_one({"_id": ObjectId(r["_id"])})
            if user:
                performances.append(
                    PerformanceEmploye(
                        employe=UserResponse(**serialize_doc(user)),
                        nombreVentes=r["nombreVentes"],
                        montantTotal=r["montantTotal"],
                        nombreClients=0
                    )
                )

    return performances
