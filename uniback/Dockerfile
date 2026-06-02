FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y build-essential gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY . /app

# Install project in editable mode with dev extras
RUN pip install --upgrade pip setuptools wheel
RUN pip install -e ".[dev]"

ENV PYTHONPATH=/app/src

CMD ["uvicorn","run_server:create_initialized_app","--factory","--host","0.0.0.0","--port","8000"]
