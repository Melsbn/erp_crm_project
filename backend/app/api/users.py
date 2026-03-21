from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.core.database import get_database
from app.schemas import UserCreate, UserUpdate, UserResponse
from app.models import UserModel, BaseModel, serialize_doc, serialize_docs
from app.api.deps import (
    require_roles,
    ROLE_ADMIN,
    ROLE_SUPERVISEUR,
    ROLE_EMPLOYE,
    is_admin,
    ensure_supervisor_can_manage_privileged_roles,
)
from app.core.security import get_password_hash

router = APIRouter()


# ---------------- GET ALL USERS ----------------
@router.get("", response_model=List[UserResponse])
async def get_users(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    query = {}
    if is_admin(current_user):
        query = {"role": ROLE_EMPLOYE}

    users = await db[UserModel.collection].find(query).to_list(1000)
    return serialize_docs(users)


# ---------------- GET USER ----------------
@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await db[UserModel.collection].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if is_admin(current_user):
        ensure_supervisor_can_manage_privileged_roles(user.get("role"), current_user)

    return serialize_doc(user)


# ---------------- CREATE USER ----------------
@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    ensure_supervisor_can_manage_privileged_roles(user.role.value, current_user)

    existing_user = await db[UserModel.collection].find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_dict = user.model_dump(exclude={"password"})

    # HASH PASSWORD
    user_dict["hashed_password"] = get_password_hash(user.password)

    user_dict.update(BaseModel.get_base_fields())

    result = await db[UserModel.collection].insert_one(user_dict)
    created_user = await db[UserModel.collection].find_one({"_id": result.inserted_id})

    return serialize_doc(created_user)


# ---------------- UPDATE USER ----------------
@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user: UserUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    update_data = user.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "email" in update_data:
        existing_user = await db[UserModel.collection].find_one({
            "email": update_data["email"],
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")

    existing_target = await db[UserModel.collection].find_one({"_id": ObjectId(user_id)})
    if not existing_target:
        raise HTTPException(status_code=404, detail="User not found")

    ensure_supervisor_can_manage_privileged_roles(existing_target.get("role"), current_user)
    if "role" in update_data:
        new_role = update_data["role"]
        ensure_supervisor_can_manage_privileged_roles(
            new_role.value if hasattr(new_role, "value") else new_role,
            current_user
        )

    result = await db[UserModel.collection].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await db[UserModel.collection].find_one({"_id": ObjectId(user_id)})
    return serialize_doc(updated_user)


# ---------------- DELETE USER ----------------
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    target_user = await db[UserModel.collection].find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    ensure_supervisor_can_manage_privileged_roles(target_user.get("role"), current_user)

    result = await db[UserModel.collection].delete_one({"_id": ObjectId(user_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return None
