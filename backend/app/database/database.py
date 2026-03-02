from sqlmodel import create_engine, Session, SQLModel, select, delete
from config import settings
import models
from schemas.models import User as UserDB, Admin, Car
import utils.security


engine = create_engine(settings.DATABASE_URL)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def add_user_db(user: models.user.UserCreateResponse):
    with Session(engine) as session:
        hashed_password = utils.security.hash_password(user.password)
        db_user = UserDB(username=user.name,
                         hashed_password=hashed_password)
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user


def user_exists(name: str):
    with Session(engine) as session:
        statement = select(UserDB).where(UserDB.username == name)
        result = session.execute(statement).scalar_one_or_none()
        return result is not None


def get_user_by_name(name: str):
    with Session(engine) as session:
        statement = select(UserDB).where(UserDB.username == name)
        result = session.execute(statement).scalar_one_or_none()
        return result


def delete_user_by_id(id: int):
    with Session(engine) as session:
        session.exec(delete(UserDB).where(UserDB.id == id))
        session.commit()


def get_users():
    with Session(engine) as session:
        result = session.execute(select(UserDB.id, UserDB.name))
        return [models.user.UserDBResponse(name=res.username, id=res.id) for res in result]


def add_car_db(car: Car):
    with Session(engine) as session:
        session.add(car)
        session.commit()
        session.refresh(car)
        return car


def get_cars():
    with Session(engine) as session:
        cars = session.exec(select(Car)).all()
        return cars


def delete_car_by_id(id: int):
    with Session(engine) as session:
        statement = delete(Car).where(Car.id == id)
        result = session.exec(statement)
        session.commit()


def create_admin(name: str, password: str):
    with Session(engine) as session:
        statement = select(Admin).where(Admin.username == name)
        admin = session.execute(statement).scalar_one_or_none()
        if not admin:
            hashed_password = utils.security.hash_password(password)
            admin = Admin(username=name, hashed_password=hashed_password)
            session.add(admin)
            session.commit()
            session.refresh(admin)
        return admin
