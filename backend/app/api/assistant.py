from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query

from app.api.deps import ROLE_ADMIN, ROLE_EMPLOYE, ROLE_SUPERVISEUR, require_roles
from app.core.database import get_database
from app.services.assistant.service import answer_question

router = APIRouter()


@router.post("/assistant/sales_forecast")
async def sales_forecast(
    payload: Dict[str, Any],
    chart: Optional[bool] = Query(None, include_in_schema=False),
    db=Depends(get_database),
    current_user: dict = Depends(
        require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE])
    ),
):
    del chart
    del current_user
    return await answer_question(payload, db)
