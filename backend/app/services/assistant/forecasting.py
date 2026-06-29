from datetime import datetime
from typing import Any, Dict, List

import pandas as pd

from .constants import MAX_FORECAST_MONTHS
from .text import _safe_scalar


def forecast_sales(df: pd.DataFrame, months_ahead: int = MAX_FORECAST_MONTHS) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["month", "predicted_sales"])

    working = df.copy()
    working["month"] = pd.to_datetime(working["month"])
    working = working.sort_values("month")
    working["predicted_sales"] = working["total"].rolling(3, min_periods=1).mean()
    recent = working["predicted_sales"].dropna().tail(3).values
    trend = (recent[-1] - recent[0]) / (len(recent) - 1) if len(recent) >= 2 else 0.0
    last_month = working["month"].max()
    last_pred = float(working["predicted_sales"].iloc[-1])

    future_rows = []
    for index in range(1, months_ahead + 1):
        next_month = last_month + pd.DateOffset(months=index)
        next_pred = max(0.0, last_pred + trend * index)  # prevent negative predictions
        future_rows.append({"month": next_month, "predicted_sales": round(next_pred, 2)})

    if future_rows:
        working = pd.concat([working, pd.DataFrame(future_rows)], ignore_index=True)

    working = working[["month", "predicted_sales"]].copy()
    working["predicted_sales"] = working["predicted_sales"].fillna(0).round(2)
    return working


def _safe_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for row in df.to_dict(orient="records"):
        clean: Dict[str, Any] = {}
        for key, value in row.items():
            if isinstance(value, (pd.Timestamp, datetime)):
                clean[key] = value.isoformat()
            elif isinstance(value, float) and pd.isna(value):
                clean[key] = None
            else:
                clean[key] = _safe_scalar(value)
        rows.append(clean)
    return rows


# ---------------------------------------------------------------------------
# Verified metrics – the authoritative aggregate layer
# Extended with stock, prospect status, and payment method breakdowns.
# ---------------------------------------------------------------------------
