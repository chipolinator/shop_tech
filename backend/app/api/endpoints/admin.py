from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from utils.security import verify_password, create_access_token, decode_token
from config import settings
from datetime import timedelta
from schemas.models import DriveType, Car, CarUpdate
from pathlib import Path
from database.database import add_car_db, delete_car_by_id, get_car_by_id, update_car_by_id
from PIL import Image
import io

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/token")
router = APIRouter()
UPLOAD_DIR = Path("/app/uploads/cars")
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG"}


async def get_admin(token: Annotated[str, Depends(oauth2_scheme)]):
    username = decode_token(token)
    if username != settings.ADMIN_NAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return username


@router.post("/token", status_code=200)
async def token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    if form_data.username != settings.ADMIN_NAME or not verify_password(form_data.password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": settings.ADMIN_NAME},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", status_code=200)
async def get_me(admin: Annotated[str, Depends(get_admin)]):
    return {"username": admin}


def validate_image_upload(contents: bytes):
    try:
        image = Image.open(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="File Error!") from exc

    if image.format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(status_code=400, detail=f"Only PNG и JPEG! Get {image.format}")


def save_car_image(filename: str, contents: bytes) -> str:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(contents)
    return f"uploads/cars/{filename}"


@router.delete("/delete_car", status_code=200)
async def delete_car(admin: Annotated[str, Depends(get_admin)], id: int):
    delete_car_by_id(id)


@router.get("/car", status_code=200)
async def get_car(admin: Annotated[str, Depends(get_admin)], id: int):
    car = get_car_by_id(id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car


@router.patch("/update_car", status_code=200)
async def update_car(
    admin: Annotated[str, Depends(get_admin)],
    id: int,
    car_data: CarUpdate,
):
    updated_car = update_car_by_id(id, car_data)
    if not updated_car:
        raise HTTPException(status_code=404, detail="Car not found")
    return updated_car


@router.post("/create_car", status_code=200)
async def create_car(
    admin: Annotated[str, Depends(get_admin)],
    brand: str = Form(...),
    model: str = Form(...),
    power: int = Form(...),
    displacement: float = Form(...),
    drive: DriveType = Form(...),
    price: int = Form(...),
    image: UploadFile = File(...),
):
    contents = await image.read()
    validate_image_upload(contents)
    db_image_path = save_car_image(image.filename, contents)

    db_car = Car(
        brand=brand,
        model=model,
        power=power,
        displacement=displacement,
        drive=drive,
        price=price,
        image_path=db_image_path,
    )
    add_car_db(db_car)
    return db_car
