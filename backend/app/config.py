from pydantic_settings import BaseSettings
from pydantic import BaseModel


class ConnectArgs(BaseModel):
    check_same_thread: bool = False


class Settings(BaseSettings):
    APP_NAME: str = "Shop API"
    HOST: str = "0.0.0.0"
    PORT: int = 5000
    ADMIN_NAME: str = "admin"
    ADMIN_PASSWORD_HASH: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str
    DATABASE_CONNECT_ARGS: ConnectArgs | None = None


settings = Settings()
