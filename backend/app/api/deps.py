from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_token
from app.core.database import get_database
from typing import Optional, List

security = HTTPBearer()

ROLE_ADMIN = "ADMIN"
ROLE_SUPERVISEUR = "SUPERVISEUR"
ROLE_EMPLOYE = "EMPLOYE"
SUPERVISOR_EMAIL = "supervisor@gmail.com"
PRIMARY_SUPERVISOR_FIELD = "is_primary_supervisor"

ALLOWED_ROLES = [ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]


def is_user_active(user: dict) -> bool:
    if "actif" in user:
        return bool(user["actif"])
    return bool(user.get("is_active", True))


def is_primary_supervisor(user: Optional[dict]) -> bool:
    return bool(user and user.get(PRIMARY_SUPERVISOR_FIELD))


def can_use_supervisor_role(user: dict) -> bool:
    if user.get("role") != ROLE_SUPERVISEUR:
        return True
    return is_primary_supervisor(user)

# ---------------- GET CURRENT USER ----------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database),
) -> dict:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(credentials.credentials)

    if not payload:
        raise credentials_exception

    if payload.get("role") not in ALLOWED_ROLES:
        raise credentials_exception

    user = await db.users.find_one({"email": payload.get("sub")})
    if not user:
        raise credentials_exception

    if not can_use_supervisor_role(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the primary supervisor account can use the supervisor role",
        )

    if not is_user_active(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return payload


# ---------------- RBAC CORE ----------------

def require_roles(roles: List[str]):

    async def role_checker(
        current_user: dict = Depends(get_current_user)
    ):

        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges"
            )

        return current_user

    return role_checker


def is_supervisor(user: dict) -> bool:
    return user.get("role") == ROLE_SUPERVISEUR


def is_admin(user: dict) -> bool:
    return user.get("role") == ROLE_ADMIN


def is_employee(user: dict) -> bool:
    return user.get("role") == ROLE_EMPLOYE


def ensure_employee_scope_or_forbidden(owner_id: Optional[str], current_user: dict):
    """Employees can only access resources they own; elevated roles bypass this."""
    if is_employee(current_user) and owner_id != current_user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges for this resource",
        )


def ensure_supervisor_can_manage_privileged_roles(target_role: str, current_user: dict):
    """
    Only supervisors can manage ADMIN and SUPERVISEUR accounts.
    Admin can only manage EMPLOYE accounts.
    """
    if target_role in [ROLE_ADMIN, ROLE_SUPERVISEUR] and not is_supervisor(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supervisors can manage admin or supervisor accounts",
        )


# ---------------- OPTIONAL AUTH ----------------

def optional_authentication(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    )
) -> Optional[dict]:

    if credentials:
        payload = decode_token(credentials.credentials)
        return payload;

    return None;
