from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.core.database import get_database
from app.schemas import CommandeCreate, CommandeUpdate, CommandeResponse, LigneCommandeResponse
from app.models import CommandeModel, LigneCommandeModel, BaseModel, serialize_doc, serialize_docs
from app.api.deps import (
    require_roles,
    ROLE_ADMIN,
    ROLE_SUPERVISEUR,
    ROLE_EMPLOYE,
    is_employee,
)

router = APIRouter()


# ---------------- GET ALL ORDERS ----------------
@router.get("", response_model=List[CommandeResponse])
async def get_orders(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    orders = await db[CommandeModel.collection].find().to_list(1000)
    return serialize_docs(orders)


# ---------------- GET ONE ORDER ----------------
@router.get("/{order_id}", response_model=CommandeResponse)
async def get_order(
    order_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")

    order = await db[CommandeModel.collection].find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return serialize_doc(order)


# ---------------- GET ORDER LINES ----------------
@router.get("/{order_id}/lines", response_model=List[LigneCommandeResponse])
async def get_order_lines(
    order_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")

    lines = await db[LigneCommandeModel.collection].find({"commandeId": order_id}).to_list(1000)
    return serialize_docs(lines)


# ---------------- CREATE ORDER ----------------
@router.post("", response_model=CommandeResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order: CommandeCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    montant_total = sum(line.sousTotal for line in order.lignes)

    order_dict = order.model_dump(exclude={"lignes"})
    # Employees cannot spoof order ownership; always bind new orders to the authenticated user.
    if is_employee(current_user):
        order_dict["userId"] = current_user.get("id")
    order_dict["montantTotal"] = montant_total
    order_dict.update(BaseModel.get_base_fields())

    result = await db[CommandeModel.collection].insert_one(order_dict)
    order_id = str(result.inserted_id)

    for line in order.lignes:
        line_dict = line.model_dump()
        line_dict["commandeId"] = order_id
        line_dict.update(BaseModel.get_base_fields())
        await db[LigneCommandeModel.collection].insert_one(line_dict)

    created_order = await db[CommandeModel.collection].find_one({"_id": result.inserted_id})
    return serialize_doc(created_order)


# ---------------- UPDATE ORDER ----------------
@router.put("/{order_id}", response_model=CommandeResponse)
async def update_order(
    order_id: str,
    order: CommandeUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")

    update_data = order.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db[CommandeModel.collection].update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    updated_order = await db[CommandeModel.collection].find_one({"_id": ObjectId(order_id)})
    return serialize_doc(updated_order)


# ---------------- DELETE ORDER ----------------
@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")

    await db[LigneCommandeModel.collection].delete_many({"commandeId": order_id})

    result = await db[CommandeModel.collection].delete_one({"_id": ObjectId(order_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    return None
