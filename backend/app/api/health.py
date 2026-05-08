from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=dict)
def health() -> dict:
    return {"status": "ok", "service": get_settings().app_name}


@router.get("/config", response_model=dict)
def config() -> dict:
    settings = get_settings()
    return {
        "app_name": settings.app_name,
        "environment": settings.app_env,
        "retrieval_mode": settings.default_retrieval_mode,
        "openai_configured": bool(settings.openai_api_key),
        "ollama_base_url": settings.ollama_base_url,
        "ollama_keep_alive": settings.ollama_keep_alive,
    }
