import os
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.config import settings
from app.providers.gemini import GeminiProvider

router = APIRouter(prefix="/settings", tags=["Settings"])


class GeminiKeyPayload(BaseModel):
    api_key: str


def mask_key(key: str) -> str:
    """Mask key preserving prefix and last 4 characters."""
    if not key:
        return ""
    clean = key.strip()
    if len(clean) <= 8:
        return "********"
    return f"{clean[:6]}...{clean[-4:]}"


def update_env_file(key_name: str, key_value: str):
    """Safely updates or inserts a key in the root .env file."""
    env_path = settings.BASE_DIR / ".env"
    lines = []
    found = False

    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith(f"{key_name}="):
                    lines.append(f"{key_name}={key_value}\n")
                    found = True
                else:
                    lines.append(line)

    if not found:
        lines.append(f"\n{key_name}={key_value}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(lines)


@router.get("/gemini-key")
def get_gemini_key_status():
    """Returns the current status and masked representation of GEMINI_API_KEY."""
    current_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    is_configured = bool(current_key and len(current_key.strip()) > 5)
    return {
        "is_configured": is_configured,
        "masked_key": mask_key(current_key) if is_configured else "",
        "transcription_model": settings.GEMINI_TRANSCRIPTION_MODEL,
        "translation_model": settings.GEMINI_TRANSLATION_MODEL,
        "tts_model": settings.GEMINI_TTS_MODEL,
    }


@router.post("/gemini-key")
def update_gemini_key(payload: GeminiKeyPayload):
    """
    Saves and activates a new Gemini API key.
    Persists to .env and updates the active runtime configuration.
    """
    new_key = payload.api_key.strip()
    if not new_key:
        raise HTTPException(status_code=400, detail="API key cannot be empty.")

    # Update in memory
    settings.GEMINI_API_KEY = new_key
    os.environ["GEMINI_API_KEY"] = new_key

    # Persist to .env
    try:
        update_env_file("GEMINI_API_KEY", new_key)
    except Exception as e:
        print(f"[Settings] Warning: Failed to write to .env: {e}")

    return {
        "status": "success",
        "message": "Gemini API key saved and activated successfully.",
        "masked_key": mask_key(new_key),
        "is_configured": True
    }


@router.delete("/gemini-key")
def remove_gemini_key():
    """Removes the saved Gemini API key."""
    settings.GEMINI_API_KEY = ""
    os.environ["GEMINI_API_KEY"] = ""

    try:
        update_env_file("GEMINI_API_KEY", "")
    except Exception as e:
        print(f"[Settings] Warning: Failed to clear .env: {e}")

    return {
        "status": "success",
        "message": "Gemini API key removed. Falling back to local offline test engine.",
        "is_configured": False
    }


def discover_gemini_models(client) -> list[str]:
    """Dynamically queries Google ModelService for available models supporting content generation."""
    models_found = []
    try:
        for m in client.models.list():
            actions = getattr(m, "supported_actions", []) or []
            name = getattr(m, "name", "")
            if name:
                clean = name.replace("models/", "")
                # Only include models that support generateContent
                if not actions or "generateContent" in actions:
                    models_found.append(clean)
    except Exception as e:
        print(f"[Settings] client.models.list() notice: {e}")

    # Priority sorting:
    # 1. flash models (fast, responsive)
    # 2. pro models
    # 3. others
    flash_models = [m for m in models_found if "flash" in m and "preview" not in m]
    other_flash = [m for m in models_found if "flash" in m and m not in flash_models]
    pro_models = [m for m in models_found if "pro" in m]
    remaining = [m for m in models_found if m not in flash_models and m not in other_flash and m not in pro_models]

    ordered = flash_models + other_flash + pro_models + remaining

    # Fallbacks if ListModels returned nothing or was restricted
    standard_fallbacks = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro",
        "gemini-2.0-flash-lite-preview-02-05",
    ]
    for sf in standard_fallbacks:
        if sf not in ordered:
            ordered.append(sf)

    return ordered


@router.post("/gemini-key/test")
def test_gemini_key(payload: Optional[GeminiKeyPayload] = None):
    """
    Tests live connection to Google Gemini API using either provided key or currently configured key.
    Dynamically discovers and binds to models supported by this account using ModelService.ListModels.
    """
    test_key = payload.api_key.strip() if (payload and payload.api_key) else settings.GEMINI_API_KEY
    if not test_key:
        raise HTTPException(status_code=400, detail="No API key provided or currently configured.")

    try:
        from google import genai
        client = genai.Client(api_key=test_key)

        # 1. Query Google ModelService dynamically
        candidates = discover_gemini_models(client)

        # Prioritize currently configured model if present
        if settings.GEMINI_TRANSLATION_MODEL in candidates:
            candidates.remove(settings.GEMINI_TRANSLATION_MODEL)
            candidates.insert(0, settings.GEMINI_TRANSLATION_MODEL)
        elif settings.GEMINI_TRANSLATION_MODEL:
            candidates.insert(0, settings.GEMINI_TRANSLATION_MODEL)

        working_model = None
        last_error = None
        test_response_text = "OK"

        for model_name in candidates:
            # Try both raw name and 'models/' prefixed
            for try_name in [model_name, f"models/{model_name}"]:
                try:
                    res = client.models.generate_content(
                        model=try_name,
                        contents="Say OK",
                    )
                    if res and (res.text or "").strip():
                        working_model = model_name
                        test_response_text = res.text.strip()
                        break
                except Exception as me:
                    last_error = me
                    err_str = str(me)
                    # Check for explicit invalid API key authentication failure
                    if "API_KEY_INVALID" in err_str or "API key not valid" in err_str:
                        raise HTTPException(
                            status_code=400,
                            detail="Invalid Google Gemini API key. Please check your key at https://aistudio.google.com/app/apikey"
                        )
                    continue
            if working_model:
                break

        if not working_model:
            raise RuntimeError(
                f"Could not connect using any candidate model ({', '.join(candidates[:6])}): {last_error}"
            )

        # Update runtime settings and persist to .env
        settings.GEMINI_TRANSLATION_MODEL = working_model
        settings.GEMINI_TRANSCRIPTION_MODEL = working_model
        try:
            update_env_file("GEMINI_TRANSLATION_MODEL", working_model)
            update_env_file("GEMINI_TRANSCRIPTION_MODEL", working_model)
        except Exception as pe:
            print(f"[Settings] Warning: Failed to persist model update to .env: {pe}")

        return {
            "status": "success",
            "message": f"Gemini API key verified successfully! Active model: {working_model}",
            "active_model": working_model,
            "test_response": test_response_text,
            "available_models": candidates[:10],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Gemini API verification failed: {str(e)}"
        )
