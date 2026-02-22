# ShopTech

## Запуск через Docker

```bash
docker-compose up --build
```

После запуска:
- Сайт: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

## Доступный функционал

- Открытие веб-страницы с формой регистрации.
- Регистрация пользователя через API: `POST /api/reg/reg_user`.
- Поля регистрации: `name`, `password`.
