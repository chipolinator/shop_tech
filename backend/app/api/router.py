from fastapi import APIRouter
from .endpoints import login,admin,cars

router = APIRouter()

router.include_router(login.router, prefix="/reg", tags=["reg"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
router.include_router(cars.router, prefix="/cars", tags=["cars"])
