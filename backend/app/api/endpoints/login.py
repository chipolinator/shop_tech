from fastapi import APIRouter, HTTPException
from models import user
import utils
from database.database import add_user_db

router = APIRouter()


@router.post("/reg_user",  status_code=200)
async def reg_user(user: user.UserCreate):
    try:
        await add_user_db(user)
    except:
        raise HTTPException(status_code=422)
