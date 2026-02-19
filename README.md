# ShopTech

## Запуск через Docker

```bash
cd backend
docker build -t my_app .
docker run -d -p 8000:5000 --name app my_app
```

После запуска:
- Сайт: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

## Доступный функционал

- Открытие веб-страницы с формой регистрации.
- Регистрация пользователя через API: `POST /api/reg/reg_user`.
- Поля регистрации: `name`, `password`.
