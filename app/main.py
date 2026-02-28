from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routes.analyze import router as analyze_router
from app.routes.dashboard import router as dashboard_router
from app.routes.feedback import router as feedback_router
from app.routes.full_analysis import router as full_analysis_router

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def create_app() -> FastAPI:
    application = FastAPI(
        title="Teacher Performance Dashboard API",
        version="0.1.0",
        description="Analyse classroom video recordings — transcription, body language, and rubric evaluation.",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(dashboard_router)
    application.include_router(analyze_router)
    application.include_router(full_analysis_router)
    application.include_router(feedback_router)

    if STATIC_DIR.is_dir():
        application.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

        @application.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            file_path = STATIC_DIR / full_path
            if file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(STATIC_DIR / "index.html"))

    return application


app = create_app()
