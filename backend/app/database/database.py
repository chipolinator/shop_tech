from sqlmodel import create_engine, Session, SQLModel
from config import settings
import models
from schemas.user import User as UserDB
import utils.security


engine = create_engine(settings.DATABASE_URL,
                       connect_args=settings.DATABASE_CONNECT_ARGS.model_dump())


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)



async def add_user_db(user: models.user.UserCreateResponse):
    with Session(engine) as session:
        hashed_password = utils.security.hash_password(user.password)
        print(user.password)
        print(hashed_password)
        db_user = UserDB(name=user.name,
                         hashed_password=hashed_password)
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user
