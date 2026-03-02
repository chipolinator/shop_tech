from sqlmodel import SQLModel, Field

from enum import Enum


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str


class Admin(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str


class DriveType(str, Enum):
    FRONT = "front"
    REAR = "rear"
    ALL = "all"


class Car(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    brand: str
    model: str
    power: int = Field(gt=0)
    displacement: float = Field(gt=0)
    drive: DriveType
    price: int = Field(gt=0)
    image_path: str
