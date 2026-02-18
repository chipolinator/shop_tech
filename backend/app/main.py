from fastapi import FastAPI, Depends
from api import router
from config import settings
from database import database
import uvicorn
app = FastAPI(
    title=settings.APP_NAME
)


@app.on_event("startup")
def on_startup():
    database.create_db_and_tables()


app.include_router(router.router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
