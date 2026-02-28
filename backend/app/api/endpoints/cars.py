from fastapi import APIRouter, Depends, HTTPException, status
from database.database import get_cars, get_user_by_name, add_to_cart,user_cart
from config import settings
from utils.security import create_access_token, verify_password, decode_token
from datetime import timedelta

from models.user import User
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
router = APIRouter()


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/cars/token")


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


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    username = decode_token(token)
    user = get_user_by_name(username)
    if user is None:
        raise credentials_exception
    return user


@router.post("/add_car")
async def add_car(car_id: int,
                  current_user: User = Depends(get_current_user)):
    add_to_cart(current_user.username, car_id)


@router.get("/cart")
async def add_car(
        current_user: User = Depends(get_current_user)):
    return user_cart(current_user.username)
