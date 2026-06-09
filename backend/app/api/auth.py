from datetime import datetime, timedelta
import logging
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from app.core.security import (
    verify_password,
    create_access_token,
    get_password_hash,
    decode_token,
    generate_reset_code,
)
from app.core.database import get_database
from app.core.email_service import send_reset_code_email
from app.core.config import settings
from app.api.deps import can_use_supervisor_role, is_user_active

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

ALLOWED_ROLES = ["ADMIN", "SUPERVISEUR", "EMPLOYE"]

# ---------------- SCHEMAS ----------------

class Login(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


# ---------------- HELPERS ----------------

def normalize_email(email: str) -> str:
    return email.strip().lower()


def serialize_current_user(user: dict) -> dict:
    return {
        "email": user["email"],
        "role": user["role"],
        "id": str(user["_id"]),
        "nom": user.get("nom", ""),
        "prenom": user.get("prenom", ""),
        "actif": user.get("actif", True),
        "dateCreation": user.get("dateCreation").isoformat() if user.get("dateCreation") else "",
    }


async def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials,
    db,
) -> dict:
    payload = decode_token(credentials.credentials)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
        )

    if payload.get("role") not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Insufficient privileges",
        )

    query = {"email": payload["sub"]}
    if ObjectId.is_valid(payload.get("id", "")):
        query = {"_id": ObjectId(payload["id"])}

    user = await db.users.find_one(query)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
        )

    if not is_user_active(user):
        raise HTTPException(
            status_code=403,
            detail="Account is deactivated",
        )

    if not can_use_supervisor_role(user):
        raise HTTPException(
            status_code=403,
            detail="Only the primary supervisor account can use the supervisor role",
        )

    return user


# ---------------- LOGIN ----------------

@router.post("/login", response_model=Token)
async def login(credentials: Login, db=Depends(get_database)):

    email = normalize_email(credentials.email)

    user = await db.users.find_one({
        "email": email,
        "role": {"$in": ALLOWED_ROLES}
    })

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not is_user_active(user):
        raise HTTPException(
            status_code=403,
            detail="Account is deactivated"
        )

    if not can_use_supervisor_role(user):
        raise HTTPException(
            status_code=403,
            detail="Only the primary supervisor account can use the supervisor role"
        )

    access_token = create_access_token(
        data={
            "sub": user["email"],
            "role": user["role"],
            "id": str(user["_id"]),
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "role": user["role"],
            "id": str(user["_id"]),
        },
    }


# ---------------- FORGOT PASSWORD ----------------

@router.post("/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_database)
):

    email = normalize_email(request.email)

    user = await db.users.find_one({
        "email": email,
        "role": {"$in": ALLOWED_ROLES}
    })

    if not user:
        return {"message": "If an account exists with this email, a reset code will be sent"}

    reset_code = generate_reset_code()
    expires_at = datetime.utcnow() + timedelta(
        minutes=settings.RESET_CODE_EXPIRY_MINUTES
    )

    await db.password_resets.insert_one({
        "email": email,
        "role": user["role"],
        "code": reset_code,
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.utcnow(),
    })

    background_tasks.add_task(
        send_reset_code_email,
        email,
        reset_code,
    )

    return {"message": "If an account exists with this email, a reset code will be sent"}


# ---------------- VERIFY CODE ----------------

@router.post("/verify-reset-code")
async def verify_reset_code(email: str, code: str, db=Depends(get_database)):

    email = normalize_email(email)

    reset_doc = await db.password_resets.find_one({
        "email": email,
        "code": code,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()},
    })

    if not reset_doc:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset code",
        )

    return {"valid": True}


# ---------------- RESET PASSWORD ----------------

@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm, db=Depends(get_database)):

    email = normalize_email(request.email)

    reset_doc = await db.password_resets.find_one({
        "email": email,
        "code": request.code,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()},
    })

    if not reset_doc:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset code",
        )

    new_password_hash = get_password_hash(request.new_password)

    result = await db.users.update_one(
        {"email": email},
        {
            "$set": {
                "hashed_password": new_password_hash,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    await db.password_resets.update_one(
        {"_id": reset_doc["_id"]},
        {
            "$set": {
                "used": True,
                "used_at": datetime.utcnow(),
            }
        },
    )

    return {"message": "Password reset successful"}


# ---------------- CURRENT USER ----------------

@router.get("/me")
async def get_current_user_info(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database),
):
    user = await get_authenticated_user(credentials, db)
    return serialize_current_user(user)


@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database),
):
    user = await get_authenticated_user(credentials, db)

    if not verify_password(request.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters",
        )

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "hashed_password": get_password_hash(request.new_password),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    return {"message": "Password changed successfully"}
