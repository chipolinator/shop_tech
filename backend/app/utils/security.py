import bcrypt as bcrypt_module
import jwt
from fastapi import HTTPException, status
from passlib.context import CryptContext
from jwt.exceptions import InvalidTokenError
from config import settings
from datetime import timedelta, datetime, timezone

# Compatibility shim for passlib + bcrypt>=4.1 where __about__ is removed.
if not hasattr(bcrypt_module, "__about__"):
    class _BcryptAbout:
        __version__ = getattr(bcrypt_module, "__version__", "unknown")

    bcrypt_module.__about__ = _BcryptAbout()

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(
            timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode["exp"] = expire
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
    except InvalidTokenError:
        raise _credentials_exception()

    username = payload.get("sub")
    if not username:
        raise _credentials_exception()
    return str(username)
