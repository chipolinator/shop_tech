FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen
COPY . .
EXPOSE 5000
CMD ["uv", "run", "python", "app/main.py"]
