from fastapi import APIRouter, Depends, HTTPException
from database.database import get_cars, get_user_by_name
from config import settings
from utils.security import create_access_token, verify_password
from datetime import timedelta

from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm
router = APIRouter()


@router.get("/all")
async def get_all_cars():
    return get_cars()


@router.post("/token", status_code=200)
async def token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user_obj = get_user_by_name(form_data.username)
    if not user_obj or not verify_password(form_data.password, user_obj.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": str(user_obj.username)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}
