from sqlmodel import create_engine, Session, SQLModel, select, delete
from config import settings
import models
from schemas.models import User as UserDB, Admin, Car, CartItem
# from schemas.user import User as UserDB
# from schemas.admin import Admin
#
# from schemas.car import Car
# from schemas.cart import CartItem
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


def add_to_cart(username: str, car_id: int):
    with Session(engine) as session:
        user = session.exec(select(UserDB).where(
            UserDB.username == username)).first()
        cart_item = CartItem(user_id=user.id, car_id=car_id)
        session.add(cart_item)
        session.commit()
        session.refresh(cart_item)
        return cart_item


def user_cart(username: str):
    with Session(engine) as session:
        user = session.exec(select(UserDB).where(
            UserDB.username == username)).first()
        cart_items = session.exec(
            select(CartItem, Car)
            .join(Car, CartItem.car_id == Car.id)
            .where(CartItem.user_id == user.id)
        ).all()

        return [
            {
                "cart_item_id": item.CartItem.id,
                "car_id": item.Car.id,
                "brand": item.Car.brand,
                "model": item.Car.model,
                "price": item.Car.price,
                "image_path": item.Car.image_path,
            }
            for item in cart_items
        ]


def purchase_car(username: str, car_id: int):
    with Session(engine) as session:
        user = session.exec(select(UserDB).where(
            UserDB.username == username)).first()

        cart_item = session.exec(
            select(CartItem)
            .where(CartItem.user_id == user.id)
            .where(CartItem.car_id == car_id)
        ).first()

        session.delete(cart_item)
        session.commit()
        return {"message": "del from cart"}


def purchase_all_cart(username: str):
    with Session(engine) as session:
        user = session.exec(select(UserDB).where(
            UserDB.username == username)).first()
        if user is None:
            return {"items_count": 0, "total_price": 0}

        cart_items = session.exec(
            select(CartItem, Car)
            .join(Car, CartItem.car_id == Car.id)
            .where(CartItem.user_id == user.id)
        ).all()

        total_price = sum(int(item.Car.price) for item in cart_items)
        items_count = len(cart_items)

        for item in cart_items:
            session.delete(item.CartItem)
        session.commit()

        return {"items_count": items_count, "total_price": total_price}


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
