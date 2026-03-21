from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.core.database import get_database
from app.schemas import ProspectCreate, ProspectUpdate, ProspectResponse, ClientCreate, ClientResponse
from app.models import ProspectModel, ClientModel, BaseModel, serialize_doc, serialize_docs
#from app.api.deps import get_current_active_admin
from app.api.deps import (
    require_roles,
    ROLE_ADMIN,
    ROLE_SUPERVISEUR,
    ROLE_EMPLOYE,
)


router = APIRouter()


@router.get("", response_model=List[ProspectResponse])
async def get_prospects(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Get all prospects."""
    prospects = await db[ProspectModel.collection].find().to_list(1000)
    return serialize_docs(prospects)


@router.get("/{prospect_id}", response_model=ProspectResponse)
async def get_prospect(
    prospect_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Get prospect by ID."""
    if not ObjectId.is_valid(prospect_id):
        raise HTTPException(status_code=400, detail="Invalid prospect ID")
    
    prospect = await db[ProspectModel.collection].find_one({"_id": ObjectId(prospect_id)})
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    return serialize_doc(prospect)


@router.post("", response_model=ProspectResponse, status_code=status.HTTP_201_CREATED)
async def create_prospect(
    prospect: ProspectCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Create a new prospect."""
    prospect_dict = prospect.model_dump()
    prospect_dict.update(BaseModel.get_base_fields())
    
    result = await db[ProspectModel.collection].insert_one(prospect_dict)
    created_prospect = await db[ProspectModel.collection].find_one({"_id": result.inserted_id})
    
    return serialize_doc(created_prospect)


@router.put("/{prospect_id}", response_model=ProspectResponse)
async def update_prospect(
    prospect_id: str,
    prospect: ProspectUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Update prospect."""
    if not ObjectId.is_valid(prospect_id):
        raise HTTPException(status_code=400, detail="Invalid prospect ID")
    
    update_data = prospect.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db[ProspectModel.collection].update_one(
        {"_id": ObjectId(prospect_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    updated_prospect = await db[ProspectModel.collection].find_one({"_id": ObjectId(prospect_id)})
    return serialize_doc(updated_prospect)


@router.delete("/{prospect_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prospect(
    prospect_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Delete prospect."""
    if not ObjectId.is_valid(prospect_id):
        raise HTTPException(status_code=400, detail="Invalid prospect ID")
    
    result = await db[ProspectModel.collection].delete_one({"_id": ObjectId(prospect_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    return None


@router.post("/{prospect_id}/convert", response_model=ClientResponse)
async def convert_prospect_to_client(
    prospect_id: str,
    client_data: ClientCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    """Convert prospect to client."""
    if not ObjectId.is_valid(prospect_id):
        raise HTTPException(status_code=400, detail="Invalid prospect ID")
    
    prospect = await db[ProspectModel.collection].find_one({"_id": ObjectId(prospect_id)})
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    # Create client from prospect data and provided client data
    client_dict = client_data.model_dump()
    client_dict.update(BaseModel.get_base_fields())
    
    result = await db[ClientModel.collection].insert_one(client_dict)
    
    # Delete the prospect
    await db[ProspectModel.collection].delete_one({"_id": ObjectId(prospect_id)})
    
    created_client = await db[ClientModel.collection].find_one({"_id": result.inserted_id})
    return serialize_doc(created_client)
