from pydantic_settings import BaseSettings
from pydantic import BaseModel


class ConnectArgs(BaseModel):
    check_same_thread: bool = False

class Settings(BaseSettings):
    APP_NAME: str = "Shop API"
    HOST: str = "0.0.0.0"
    PORT: int = 5000
    DATABASE_URL: str = "sqlite:///./shop.db"
    DATABASE_CONNECT_ARGS: ConnectArgs | None = ConnectArgs()



settings = Settings()
