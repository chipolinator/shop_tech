from fastapi import APIRouter
from .endpoints import login

router = APIRouter()

router.include_router(login.router, prefix="/reg", tags=["reg"])
