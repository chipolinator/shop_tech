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


class UserLoginResponse(BaseModel):
    name: str
    password: str


class User(BaseModel):
    name: str
    password: str


class UserDBResponse(BaseModel):
    id: int
    name: str
