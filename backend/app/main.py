from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api import router
from config import settings
from database import database
from pathlib import Path
import uvicorn

app = FastAPI(
    title=settings.APP_NAME
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
