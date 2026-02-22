from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api import router
from config import settings
from database import database
from pathlib import Path
import uvicorn

app = FastAPI(
    title=settings.APP_NAME
)

ALLOWED_ORIGINS = [
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:80",
    "http://127.0.0.1:80",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.on_event("startup")
def on_startup():
    database.create_db_and_tables()
    database.create_admin(settings.ADMIN_NAME, settings.ADMIN_PASSWORD_HASH)


app.include_router(router.router, prefix="/api")
Path("uploads").mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
