from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.core.database import get_database
from app.schemas import (
    InteractionCreate, InteractionUpdate, InteractionResponse,
    RapportCreate, RapportResponse
)
from app.models import InteractionModel, RapportModel, BaseModel, serialize_doc, serialize_docs
#from app.api.deps import get_current_active_admin
from app.api.deps import (
    require_roles,
    ROLE_ADMIN,
    ROLE_SUPERVISEUR,
    ROLE_EMPLOYE,
)


router = APIRouter()


# Interaction endpoints
@router.get("/interactions", response_model=List[InteractionResponse])
async def get_interactions(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Get all interactions."""
    interactions = await db[InteractionModel.collection].find().to_list(1000)
    return serialize_docs(interactions)


@router.get("/interactions/{interaction_id}", response_model=InteractionResponse)
async def get_interaction(
    interaction_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Get interaction by ID."""
    if not ObjectId.is_valid(interaction_id):
        raise HTTPException(status_code=400, detail="Invalid interaction ID")
    
    interaction = await db[InteractionModel.collection].find_one({"_id": ObjectId(interaction_id)})
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    return serialize_doc(interaction)


@router.post("/interactions", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    interaction: InteractionCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Create a new interaction."""
    interaction_dict = interaction.model_dump()
    # Enforce author from authenticated user to avoid spoofed userId values.
    interaction_dict["userId"] = current_user.get("id")
    interaction_dict.update(BaseModel.get_base_fields())
    
    result = await db[InteractionModel.collection].insert_one(interaction_dict)
    created_interaction = await db[InteractionModel.collection].find_one({"_id": result.inserted_id})
    
    return serialize_doc(created_interaction)


@router.put("/interactions/{interaction_id}", response_model=InteractionResponse)
async def update_interaction(
    interaction_id: str,
    interaction: InteractionUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Update interaction."""
    if not ObjectId.is_valid(interaction_id):
        raise HTTPException(status_code=400, detail="Invalid interaction ID")
    
    update_data = interaction.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db[InteractionModel.collection].update_one(
        {"_id": ObjectId(interaction_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    updated_interaction = await db[InteractionModel.collection].find_one({"_id": ObjectId(interaction_id)})
    return serialize_doc(updated_interaction)


@router.delete("/interactions/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interaction(
    interaction_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Delete interaction."""
    if not ObjectId.is_valid(interaction_id):
        raise HTTPException(status_code=400, detail="Invalid interaction ID")
    
    result = await db[InteractionModel.collection].delete_one({"_id": ObjectId(interaction_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    return None


# Report endpoints
@router.get("/reports", response_model=List[RapportResponse])
async def get_reports(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_SUPERVISEUR]))
):
    """Get all reports."""
    reports = await db[RapportModel.collection].find().to_list(1000)
    return serialize_docs(reports)


@router.get("/reports/{report_id}", response_model=RapportResponse)
async def get_report(
    report_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_SUPERVISEUR]))
):
    """Get report by ID."""
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    report = await db[RapportModel.collection].find_one({"_id": ObjectId(report_id)})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return serialize_doc(report)


@router.post("/reports", response_model=RapportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report: RapportCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_SUPERVISEUR]))
):
    """Create a new report."""
    report_dict = report.model_dump()
    report_dict.update(BaseModel.get_base_fields())
    
    result = await db[RapportModel.collection].insert_one(report_dict)
    created_report = await db[RapportModel.collection].find_one({"_id": result.inserted_id})
    
    return serialize_doc(created_report)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_SUPERVISEUR]))
):
    """Delete report."""
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    result = await db[RapportModel.collection].delete_one({"_id": ObjectId(report_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return None
