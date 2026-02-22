# ShopTech

## Запуск через Docker

Выполняйте команды из папки `shop_tech`.

```bash
docker-compose up --build
```

После запуска:
- Сайт: `http://localhost:80`
<!-- - Swagger UI: `http://localhost:8000/docs` -->

## Доступный функционал

- Открытие веб-страницы с формой регистрации.
- Регистрация пользователя через API: `POST /api/reg/reg_user`.
- Авторизация пользователя: `POST /api/reg/token`.
- Получение текущего пользователя: `GET /api/reg/me`.
- Авторизация администратора: `POST /api/admin/token`.
- Создание машины (админ): `POST /api/admin/create_car`.
- Список машин: `GET /api/cars/all`.
- Поля регистрации: `name`, `password`.
