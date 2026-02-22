from pydantic_settings import BaseSettings
from pydantic import BaseModel
import os


class ConnectArgs(BaseModel):
    check_same_thread: bool = False


class Settings(BaseSettings):
    APP_NAME: str = "Shop API"
    HOST: str = "0.0.0.0"
    PORT: int = 5000
    ADMIN_NAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = "$2y$12$M7vvq0aPY994eVZyna5RoeU3TYGHK5Wqnfvra9TYSG7CstTeHFx42"
    SECRET_KEY: str = "example_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    # DATABASE_URL: str = "sqlite:///./shop.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    DATABASE_CONNECT_ARGS: ConnectArgs | None = None


settings = Settings()
