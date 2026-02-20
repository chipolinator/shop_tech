from fastapi import APIRouter,Depends,HTTPException
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from utils.security import verify_password,create_access_token,decode_token
from config import settings
from datetime import timedelta


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/token")
router = APIRouter()


@router.post("/token", status_code=200)
async def token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    if form_data.username != settings.ADMIN_NAME or not verify_password(form_data.password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": settings.ADMIN_NAME},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}
