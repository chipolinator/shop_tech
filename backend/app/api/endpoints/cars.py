from fastapi import APIRouter
from database.database import get_cars
router = APIRouter()

@router.get("/all")
async def get_all_cars():
    return get_cars()

