from fastapi import APIRouter
from app.api.v1.projects import router as projects_router
from app.api.v1.languages import router as languages_router
from app.api.v1.voices import router as voices_router
from app.api.v1.transcription import router as transcription_router
from app.api.v1.translation import router as translation_router
from app.api.v1.dubbing import router as dubbing_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.downloads import router as downloads_router
from app.api.v1.usage import router as usage_router
from app.api.v1.settings import router as settings_router
from app.api.v1.admin import router as admin_router
from app.api.v1.access import router as access_router

api_v1_router = APIRouter()
api_v1_router.include_router(projects_router)
api_v1_router.include_router(languages_router)
api_v1_router.include_router(voices_router)
api_v1_router.include_router(transcription_router)
api_v1_router.include_router(translation_router)
api_v1_router.include_router(dubbing_router)
api_v1_router.include_router(jobs_router)
api_v1_router.include_router(downloads_router)
api_v1_router.include_router(usage_router)
api_v1_router.include_router(settings_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(access_router)
