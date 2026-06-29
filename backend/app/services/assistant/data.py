from typing import Any, Dict, List
import asyncio
import re

from .constants import COLLECTION_HINTS, MAX_SAMPLE_DOCS, MAX_TEXT_MATCHES
from .text import _build_regex_tokens, _sanitize_document


async def _fetch_collection_counts(db, collections: List[str]) -> Dict[str, int]:
    tasks = [db[name].count_documents({}) for name in collections]
    values = await asyncio.gather(*tasks)
    return {name: values[index] for index, name in enumerate(collections)}


async def _fetch_collection_samples(
    db, collections: List[str]
) -> Dict[str, List[Dict[str, Any]]]:
    results: Dict[str, List[Dict[str, Any]]] = {}
    for name in collections:
        hints = COLLECTION_HINTS.get(name, {})
        sort_field = hints.get("sort_field")
        cursor = db[name].find({}, {"passwordHash": 0})
        if sort_field:
            cursor = cursor.sort(sort_field, -1)
        docs = await cursor.limit(MAX_SAMPLE_DOCS).to_list(MAX_SAMPLE_DOCS)
        results[name] = [_sanitize_document(doc) for doc in docs]
    return results


async def _find_text_matches(
    db, collections: List[str], question: str
) -> Dict[str, List[Dict[str, Any]]]:
    tokens = _build_regex_tokens(question)
    if not tokens:
        return {}

    matches: Dict[str, List[Dict[str, Any]]] = {}
    for name in collections:
        text_fields = COLLECTION_HINTS.get(name, {}).get("text_fields", [])
        if not text_fields:
            continue

        clauses: List[Dict[str, Any]] = []
        for token in tokens:
            for field in text_fields:
                clauses.append({field: {"$regex": re.escape(token), "$options": "i"}})

        docs = (
            await db[name]
            .find({"$or": clauses}, {"passwordHash": 0})
            .limit(MAX_TEXT_MATCHES)
            .to_list(MAX_TEXT_MATCHES)
        )
        if docs:
            matches[name] = [_sanitize_document(doc) for doc in docs]

    return matches


# ---------------------------------------------------------------------------
# Sales forecasting (unchanged algorithm, improved DataFrame validation)
# ---------------------------------------------------------------------------
