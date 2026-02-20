from fastapi import APIRouter, HTTPException, Depends, status
from typing import Annotated
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from models import user
from utils.security import verify_password, create_access_token, decode_token
from database.database import add_user_db, user_exists, get_user_by_name
from datetime import timedelta, timezone
from config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/reg/token")


@router.post("/reg_user",  status_code=200)
async def reg_user(user: user.UserCreate):
    exists = user_exists(user.name)
    if not exists:
        add_user_db(user)
        return user
    raise HTTPException(status_code=409, detail="User exists")


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


@router.get("/me", status_code=200)
async def get_me(current_user: Annotated[user.User, Depends(get_current_user)]):
    return current_user
