from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from utils.security import verify_password, create_access_token, decode_token
from config import settings
from datetime import timedelta
from schemas.models import DriveType, Car
from pathlib import Path
from database.database import add_car_db, delete_car_by_id, delete_user_by_id,get_users
from PIL import Image
import io

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/token")
router = APIRouter()


async def get_admin(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    username = decode_token(token)
    admin = settings.ADMIN_NAME
    if admin is None:
        raise credentials_exception
    return admin


@router.post("/token", status_code=200)
async def token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    if form_data.username != settings.ADMIN_NAME or not verify_password(form_data.password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": settings.ADMIN_NAME},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

UPLOAD_DIR = "/app/uploads/cars"


@router.delete("/delete_car", status_code=200)
async def delete_car(admin: Annotated[settings.ADMIN_NAME, Depends(get_admin)], id: int):
    delete_car_by_id(id)


@router.delete("/delete_user", status_code=200)
async def delete_user(admin: Annotated[settings.ADMIN_NAME, Depends(get_admin)], id: int):
    delete_user_by_id(id)
@router.get("/all_users",status_code=200)
async def get_all_users(admin: Annotated[settings.ADMIN_NAME, Depends(get_admin)]):
    return get_users()


@router.post("/create_car", status_code=200)
async def create_car(admin: Annotated[settings.ADMIN_NAME, Depends(get_admin)],
                     brand: str = Form(...),
                     model: str = Form(...),
                     power: int = Form(...),
                     displacement: float = Form(...),
                     drive: DriveType = Form(...),
                     price: float = Form(...),
                     image: UploadFile = File(...)):
    allowed_formats = {'JPEG', 'PNG'}
    try:
        contents = await image.read()
        img = Image.open(io.BytesIO(contents))
        if img.format not in allowed_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Only PNG и JPEG! Get {img.format}"
            )
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=400,
            detail="File Error!"
        )

    Path("/app/uploads/cars").mkdir(parents=True, exist_ok=True)
    file_path = f"/app/uploads/cars/{image.filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    db_image_path = f"uploads/cars/{image.filename}"

    db_car = Car(
        brand=brand,
        model=model,
        power=power,
        displacement=displacement,
        drive=DriveType(drive),
        price=price,
        image_path=db_image_path
    )
    add_car_db(db_car)
    return db_car
