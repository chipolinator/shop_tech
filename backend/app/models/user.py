from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    password: str


class UserCreateResponse(BaseModel):
    name: str
    password: str


class UserLogin(BaseModel):
    name: str
    password: str
