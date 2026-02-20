FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY backend /app/backend
COPY frontend /app/frontend

WORKDIR /app/backend
RUN uv sync --frozen

EXPOSE 5000
CMD ["uv", "run", "python", "app/main.py"]
