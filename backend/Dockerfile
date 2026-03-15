FROM python:3.13-slim

# Keep Docker image lightweight and avoid GHCR fetch issues by installing uv via pip.
WORKDIR /app/backend

# Install uv runtime command and dependencies.
RUN pip install --no-cache-dir uv

# Copy locked dependencies and install Python deps.
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen

# Copy application sources.
COPY . .

EXPOSE 5000
CMD ["uv", "run", "python", "app/main.py"]
