from fastapi import APIRouter
from .endpoints import login,admin

router = APIRouter()

router.include_router(login.router, prefix="/reg", tags=["reg"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
