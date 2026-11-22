import os
import shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta
from app.config import settings


class StorageCleaner:
    @staticmethod
    def cleanup_temp_dir(older_than_hours: int = 2):
        """Purge temporary files older than a specified duration."""
        now = datetime.now(timezone.utc)
        temp_dir = settings.TEMP_DIR
        if not temp_dir.exists():
            return

        for item in temp_dir.iterdir():
            try:
                mtime = datetime.fromtimestamp(item.stat().st_mtime, timezone.utc)
                if now - mtime > timedelta(hours=older_than_hours):
                    if item.is_dir():
                        shutil.rmtree(item, ignore_errors=True)
                    else:
                        item.unlink(missing_ok=True)
            except Exception:
                pass

    @staticmethod
    def delete_project_storage(project_id: str):
        """Delete all stored assets associated with a project."""
        for base_dir in [settings.UPLOADS_DIR, settings.PROCESSED_DIR, settings.REFERENCES_DIR, settings.TEMP_DIR]:
            for item in base_dir.glob(f"*{project_id}*"):
                try:
                    if item.is_dir():
                        shutil.rmtree(item, ignore_errors=True)
                    else:
                        item.unlink(missing_ok=True)
                except Exception:
                    pass
