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
    PRIMARY_SUPERVISOR_FIELD,
    is_admin,
    is_primary_supervisor,
    ensure_supervisor_can_manage_privileged_roles,
)
from app.core.security import get_password_hash

router = APIRouter()


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def ensure_valid_supervisor_assignment(
    db,
    role: str,
    current_user_id: str | None = None,
):
    if role != ROLE_SUPERVISEUR:
        return

    query = {PRIMARY_SUPERVISOR_FIELD: True}
    if current_user_id and ObjectId.is_valid(current_user_id):
        query["_id"] = {"$ne": ObjectId(current_user_id)}

    existing_primary = await db[UserModel.collection].find_one(query)
    if existing_primary:
        raise HTTPException(
            status_code=400,
            detail="The primary supervisor account already exists",
        )


# ---------------- GET ALL USERS ----------------
@router.get("", response_model=List[UserResponse])
async def get_users(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    query = {}
    if is_admin(current_user):
        query = {
            "$or": [
                {"role": ROLE_EMPLOYE},
                {PRIMARY_SUPERVISOR_FIELD: True, "role": ROLE_SUPERVISEUR},
            ]
        }

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

    normalized_email = normalize_email(user.email)
    await ensure_valid_supervisor_assignment(db, user.role.value)

    existing_user = await db[UserModel.collection].find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_dict = user.model_dump(exclude={"password"})
    user_dict["email"] = normalized_email
    if user.role.value == ROLE_SUPERVISEUR:
        user_dict[PRIMARY_SUPERVISOR_FIELD] = True

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

    existing_target = await db[UserModel.collection].find_one({"_id": ObjectId(user_id)})
    if not existing_target:
        raise HTTPException(status_code=404, detail="User not found")

    if is_primary_supervisor(existing_target):
        allowed_fields = {"nom", "prenom", "email"}
        disallowed_fields = set(update_data.keys()) - allowed_fields
        if disallowed_fields:
            raise HTTPException(
                status_code=400,
                detail="The primary supervisor can only update first name, last name, and email",
            )

    target_role = update_data.get("role", existing_target.get("role"))
    target_role_value = target_role.value if hasattr(target_role, "value") else target_role

    if "email" in update_data:
        target_email = normalize_email(update_data["email"])
        update_data["email"] = target_email
        existing_user = await db[UserModel.collection].find_one({
            "email": target_email,
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")

    if "email" not in update_data:
        target_email = normalize_email(existing_target["email"])

    ensure_supervisor_can_manage_privileged_roles(existing_target.get("role"), current_user)
    if "role" in update_data:
        new_role = update_data["role"]
        ensure_supervisor_can_manage_privileged_roles(
            new_role.value if hasattr(new_role, "value") else new_role,
            current_user
        )

    await ensure_valid_supervisor_assignment(
        db,
        target_role_value,
        current_user_id=user_id,
    )

    if target_role_value == ROLE_SUPERVISEUR:
        update_data[PRIMARY_SUPERVISOR_FIELD] = True
    elif PRIMARY_SUPERVISOR_FIELD in update_data:
        update_data.pop(PRIMARY_SUPERVISOR_FIELD)

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

    if is_primary_supervisor(target_user):
        raise HTTPException(
            status_code=400,
            detail="The primary supervisor account cannot be deleted",
        )

    ensure_supervisor_can_manage_privileged_roles(target_user.get("role"), current_user)

    result = await db[UserModel.collection].delete_one({"_id": ObjectId(user_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return None
