# ShopTech

## Запуск через Docker

Выполняйте команды из папки `shop_tech`.

Сначала подготовьте переменные окружения:

```bash
cp .env.example .env
```

```bash
docker compose up --build
docker compose down
```

После запуска:

- Сайт: `http://localhost:80`
<!-- - Swagger UI: `http://localhost:8000/docs` -->

## Доступный функционал

- Открытие веб-страницы аккаунта с выбором действия: регистрация или вход.
- Регистрация пользователя через API: `POST /api/reg/reg_user`.
- Авторизация пользователя: `POST /api/reg/token`.
- Получение текущего пользователя: `GET /api/reg/me`.
- Авторизация администратора: `POST /api/admin/token`.
- Создание машины (админ): `POST /api/admin/create_car`.
- Список машин: `GET /api/cars/all`.
- Поля регистрации: `name`, `password`.


flowchart TB
  subgraph nginx["Nginx"]
    A[Browser]
    B["Статика /index.html, /cars.html, /static/*"]
    C["/api/* -> backend:5000"]
  end

  subgraph frontend["Frontend (статический)"]
    F1["index.html, cars.html, cart.html"]
    F2["static/auth.js"]
    F3["static/cars.js"]
    F4["static/cart.js"]
  end

  subgraph backend["Backend (FastAPI)"]
    S1["app/main.py"]
    S2["app/api/*.py"]
    S3["app/database/database.py"]
    S4["app/models & schemas"]
    S5["uv + pyproject.toml deps"]
  end

  subgraph db["PostgreSQL"]
    D1["Данные: users, cars, orders"]
  end

  A -->|HTTP GET| B
  A -->|HTTP /api| C
  C -->|proxy| S1
  F3 -->|fetch /api/cars/all| S1
  F4 -->|fetch /api/cars/all| S1
  S1 -->|SQL| D1
  S2 -->|ORM| D1
  S1 -->|JSON| F3
  S1 -->|JSON| F4

  classDef color fill:#f3f4f5,stroke:#a0a0a0;
  class nginx,frontend,backend,db color;