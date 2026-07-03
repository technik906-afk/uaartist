FROM python:3.12-slim

# - no .pyc files, unbuffered stdout for readable logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python deps first for better layer caching.
# psycopg[binary] ships prebuilt wheels, so no system build tools are needed.
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY . .

EXPOSE 8000

# Dev default; overridden by docker-compose. Production uses gunicorn.
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
