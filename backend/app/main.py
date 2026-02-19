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

BASE_DIR = Path(__file__).resolve().parent
SITE_DIR = BASE_DIR / "site"


@app.on_event("startup")
def on_startup():
    database.create_db_and_tables()


app.include_router(router.router, prefix="/api")
app.mount("/site", StaticFiles(directory=SITE_DIR), name="site")


@app.get("/")
async def home():
    return FileResponse(SITE_DIR / "index.html")

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
