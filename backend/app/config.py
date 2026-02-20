from pydantic_settings import BaseSettings
from pydantic import BaseModel


class ConnectArgs(BaseModel):
    check_same_thread: bool = False


class Settings(BaseSettings):
    APP_NAME: str = "Shop API"
    HOST: str = "0.0.0.0"
    PORT: int = 5000
    ADMIN_NAME: str = "example_name"
    ADMIN_PASSWORD_HASH: str = "$2b$12$R5lBiA5jo27PTe68BTya8OCz3seTtw736qpsfD2P4t39wXVI6HFiG"
    SECRET_KEY: str = "example_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "sqlite:///./shop.db"
    DATABASE_CONNECT_ARGS: ConnectArgs | None = ConnectArgs()


settings = Settings()
