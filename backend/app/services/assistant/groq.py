from typing import Dict, List
import asyncio

import httpx

from app.core.config import settings

from .constants import GROQ_API_URL


async def _groq_call(messages: List[Dict[str, str]], temperature: float = 0.1) -> str:
    if not settings.GROQ_API_KEY:
        return ""

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1500,  # Increased to allow fuller answers
    }
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(GROQ_API_URL, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception as exc:
            print(f"Groq attempt {attempt + 1} failed: {exc}")
            if attempt < 2:
                await asyncio.sleep(1.0)

    return ""


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------
