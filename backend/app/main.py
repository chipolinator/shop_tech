from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api import router
from config import settings
from database import database
import uvicorn

app = FastAPI(
    title=settings.APP_NAME
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
STATIC_DIR = FRONTEND_DIR / "static"


@app.on_event("startup")
def on_startup():
    database.create_db_and_tables()
    database.create_admin(settings.ADMIN_NAME, settings.ADMIN_PASSWORD_HASH)


app.include_router(router.router, prefix="/api")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def home():
    return FileResponse(FRONTEND_DIR / "index.html")

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
