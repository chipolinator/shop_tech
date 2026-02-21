# ShopTech

## Запуск через Docker

Выполняйте команды из папки `shop_tech`.

```bash
docker build -t shoptech-backend -f backend/Dockerfile .
docker build -t shoptech-frontend -f frontend/Dockerfile frontend

docker run -d --name shoptech-backend -p 5000:5000 shoptech-backend
docker run -d --name shoptech-frontend -p 8000:80 shoptech-frontend
```

После запуска:
- Сайт: `http://localhost:8000`
- Swagger UI: `http://localhost:5000/docs`

## Доступный функционал

- Открытие веб-страницы с формой регистрации.
- Регистрация пользователя через API: `POST /api/reg/reg_user`.
- Авторизация пользователя: `POST /api/reg/token`.
- Получение текущего пользователя: `GET /api/reg/me`.
- Авторизация администратора: `POST /api/admin/token`.
- Создание машины (админ): `POST /api/admin/create_car`.
- Список машин: `GET /api/cars/all`.
- Поля регистрации: `name`, `password`.
