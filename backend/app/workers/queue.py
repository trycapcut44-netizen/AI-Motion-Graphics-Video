import asyncio
import threading
import traceback
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Coroutine, Dict, Any
from datetime import datetime, timezone
from app.db.session import SessionLocal
from app.db.models import ProcessingJob


class BackgroundJobQueue:
    def __init__(self, max_concurrent: int = 2):
        self.max_concurrent = max_concurrent
        self.executor = ThreadPoolExecutor(
            max_workers=max_concurrent,
            thread_name_prefix="dubbing_worker"
        )
        self.cancel_flags: Dict[str, threading.Event] = {}
        self.active_futures: Dict[str, Any] = {}

    def enqueue_job(self, job_id: str, coro_func: Callable[..., Coroutine], *args, **kwargs):
        """
        Enqueue an asynchronous media/AI processing job on a dedicated background
        worker thread with its own isolated asyncio event loop so FastAPI's main
        HTTP server loop is NEVER blocked by FFmpeg, Gemini SDK, or audio analysis.
        """
        cancel_event = threading.Event()
        self.cancel_flags[job_id] = cancel_event

        def _thread_runner():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(
                    self._job_wrapper(job_id, coro_func, cancel_event, *args, **kwargs)
                )
            finally:
                try:
                    loop.close()
                except Exception:
                    pass

        future = self.executor.submit(_thread_runner)
        self.active_futures[job_id] = future
        return future

    async def _job_wrapper(
        self,
        job_id: str,
        coro_func: Callable[..., Coroutine],
        cancel_event: threading.Event,
        *args,
        **kwargs,
    ):
        db = SessionLocal()
        try:
            if cancel_event.is_set():
                raise asyncio.CancelledError()

            # Mark started
            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
            if job:
                job.status = "RUNNING"
                job.started_at = datetime.now(timezone.utc)
                db.commit()

            # Execute pipeline task inside this worker thread's isolated loop
            await coro_func(job_id, *args, **kwargs)

        except asyncio.CancelledError:
            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
            if job:
                job.status = "CANCELLED"
                job.stage = "CANCELLED"
                job.message = "Job was cancelled by user."
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
        except Exception as e:
            err_msg = str(e)
            tb = traceback.format_exc()
            print(f"[JobQueue] Job {job_id} failed: {err_msg}\n{tb}")
            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
            if job:
                job.status = "FAILED"
                job.stage = "FAILED"
                job.message = f"Error: {err_msg}"
                job.error_code = "PROCESSING_ERROR"
                job.error_details = tb
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
        finally:
            self.active_futures.pop(job_id, None)
            self.cancel_flags.pop(job_id, None)
            db.close()

    def cancel_job(self, job_id: str) -> bool:
        ev = self.cancel_flags.get(job_id)
        if ev:
            ev.set()
        future = self.active_futures.get(job_id)
        if future and not future.done():
            future.cancel()
            return True
        return bool(ev)


job_queue = BackgroundJobQueue()
