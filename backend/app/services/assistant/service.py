from typing import Any, Dict
import asyncio

from fastapi import HTTPException

from .collections import _select_collections
from .constants import INSTANT_REPLIES
from .data import (
    _fetch_collection_counts,
    _fetch_collection_samples,
    _find_text_matches,
)
from .fallback import _fallback_answer
from .groq import _groq_call
from .language import _detect_language
from .metrics import _compute_verified_metrics
from .prompts import _build_data_briefing, _build_messages, _build_system_prompt
from .text import _normalize_text, _strip_charts


async def answer_question(payload: Dict[str, Any], db) -> Dict[str, Any]:
    question = str(payload.get("question") or "").strip()
    history = payload.get("history") or []
    language = _detect_language(payload.get("language"), question)

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    q_lower = _normalize_text(question)
    if q_lower in INSTANT_REPLIES[language]:
        return {
            "answer": INSTANT_REPLIES[language][q_lower],
            "chart": None,
            "predictions": [],
            "top_products": [],
            "top_clients": [],
        }

    history_text = " ".join(
        str(msg.get("content", ""))[:200]
        for msg in _strip_charts(history[-6:])
    )
    available_collections = await db.list_collection_names()
    selected_collections = _select_collections(question, history_text, available_collections)

    collection_counts, metrics = await asyncio.gather(
        _fetch_collection_counts(db, available_collections),
        _compute_verified_metrics(db),
    )
    collection_samples, text_matches = await asyncio.gather(
        _fetch_collection_samples(db, selected_collections),
        _find_text_matches(db, selected_collections, question),
    )

    user_message_with_data = _build_data_briefing(
        question=question,
        language=language,
        collection_counts=collection_counts,
        selected_collections=selected_collections,
        samples=collection_samples,
        matches=text_matches,
        metrics=metrics,
    )

    messages = _build_messages(
        history, _build_system_prompt(language), user_message_with_data
    )
    answer = await _groq_call(messages)

    if not answer:
        answer = _fallback_answer(
            question=question,
            language=language,
            collection_counts=collection_counts,
            selected_collections=selected_collections,
            matches=text_matches,
            metrics=metrics,
        )

    return {
        "answer": answer,
        "chart": None,
        "predictions": metrics.get("sales_forecast", []),
        "top_products": metrics.get("top_products", []),
        "top_clients": metrics.get("top_clients", []),
    }
