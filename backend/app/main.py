from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api import router
from config import settings
from database import database
from pathlib import Path
import uvicorn


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.create_db_and_tables()
    database.create_admin(settings.ADMIN_NAME, settings.ADMIN_PASSWORD_HASH)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(router.router, prefix="/api")
Path("uploads").mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
