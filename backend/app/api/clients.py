from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.core.database import get_database
from app.schemas import ClientCreate, ClientUpdate, ClientResponse
from app.models import ClientModel, BaseModel, serialize_doc, serialize_docs
from app.api.deps import (
    require_roles,
    ROLE_ADMIN,
    ROLE_SUPERVISEUR,
    ROLE_EMPLOYE,
)

router = APIRouter()


# ---------------- GET ALL CLIENTS ----------------
@router.get("", response_model=List[ClientResponse])
async def get_clients(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    clients = await db[ClientModel.collection].find().to_list(1000)
    return serialize_docs(clients)


# ---------------- GET CLIENT ----------------
@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="Invalid client ID")

    client = await db[ClientModel.collection].find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return serialize_doc(client)


# ---------------- CREATE CLIENT ----------------
@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client: ClientCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    client_dict = client.model_dump()
    client_dict.update(BaseModel.get_base_fields())

    result = await db[ClientModel.collection].insert_one(client_dict)
    created_client = await db[ClientModel.collection].find_one({"_id": result.inserted_id})

    return serialize_doc(created_client)


# ---------------- UPDATE CLIENT ----------------
@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client: ClientUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="Invalid client ID")

    update_data = client.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db[ClientModel.collection].update_one(
        {"_id": ObjectId(client_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")

    updated_client = await db[ClientModel.collection].find_one({"_id": ObjectId(client_id)})
    return serialize_doc(updated_client)


# ---------------- DELETE CLIENT ----------------
@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="Invalid client ID")

    result = await db[ClientModel.collection].delete_one({"_id": ObjectId(client_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")

    return None
