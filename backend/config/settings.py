"""
Django settings for the uaartist backend.

Configuration is driven by environment variables (12-factor style) via
django-environ. For local development copy `.env.example` -> `.env` in the
repository root; docker-compose injects the same variables into the container.
"""

from datetime import timedelta
from pathlib import Path

import environ

# backend/ directory (contains manage.py)
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
# Read repo-root .env when running on the host (no error if the file is absent;
# inside Docker the variables are injected by compose via env_file).
environ.Env.read_env(BASE_DIR.parent / ".env")

# --- Core -------------------------------------------------------------------
SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# --- Applications -----------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "rest_framework_simplejwt",
    # Local apps
    "apps.core",
    "apps.catalog",
    "apps.orders",
    "apps.accounts",
    "apps.payments",
    "apps.delivery",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Database ---------------------------------------------------------------
# DATABASE_URL example: postgres://user:pass@host:5432/dbname
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://uaartist:uaartist@localhost:5432/uaartist",
    ),
}

# --- Password validation ----------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internationalization ---------------------------------------------------
LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

# --- Static & media ---------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS (frontend origin) -------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)

# --- Работа за reverse-proxy (nginx на проде) ---------------------------------
# Django должен доверять X-Forwarded-Proto от nginx, иначе не поймёт, что HTTPS.
if env.bool("DJANGO_BEHIND_PROXY", default=False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Django 4+: для POST в админку по HTTPS нужен явный список доверенных origin.
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])

# --- Django REST Framework --------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.DefaultPagination",
    "PAGE_SIZE": 12,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Применяется только к вьюхам с throttle_scope.
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "orders": "20/hour",
        "auth": "10/hour",
        "payments": "30/hour",
        # поллинг статуса со страницы «Спасибо» — часто, но недолго
        "payments_status": "300/hour",
    },
    # JWT: авторизованные запросы несут Authorization: Bearer <token>.
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
}

# --- JWT (simplejwt) ----------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
}

# --- Email --------------------------------------------------------------------
# Dev: console backend (письма в stdout контейнера). Prod: SMTP через env.
EMAIL_BACKEND = env(
    "DJANGO_EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = env("DJANGO_DEFAULT_FROM_EMAIL", default="uaartist <noreply@uaartist.ru>")
# SMTP (нужен только при smtp-backend). From должен быть на домене,
# подтверждённом у провайдера (SPF/DKIM в DNS), иначе письма уйдут в спам.
EMAIL_HOST = env("DJANGO_EMAIL_HOST", default="")
EMAIL_PORT = env.int("DJANGO_EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("DJANGO_EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("DJANGO_EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("DJANGO_EMAIL_USE_TLS", default=True)  # STARTTLS (порт 587)
EMAIL_USE_SSL = env.bool("DJANGO_EMAIL_USE_SSL", default=False)  # SSL (порт 465), не вместе с TLS
# send_mail синхронный внутри оформления заказа: без таймаута зависший SMTP
# подвесит чекаут до таймаута gunicorn (60 c).
EMAIL_TIMEOUT = env.int("DJANGO_EMAIL_TIMEOUT", default=10)

# База фронтенда — для ссылок в письмах (сброс пароля) и return_url оплаты.
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

# --- Доставка -----------------------------------------------------------------
# СДЭК API v2 (ЛК бизнеса → Интеграция). Пусто = способ недоступен на витрине.
CDEK_ACCOUNT = env("CDEK_ACCOUNT", default="")
CDEK_SECURE_PASSWORD = env("CDEK_SECURE_PASSWORD", default="")
CDEK_FROM_CITY_CODE = env.int("CDEK_FROM_CITY_CODE", default=403)  # Череповец
# Почта России: открытый тарификатор, индекс отправления
POCHTA_FROM_POSTCODE = env("POCHTA_FROM_POSTCODE", default="162600")  # Череповец

# --- ЮKassa -------------------------------------------------------------------
# Пустые ключи = онлайн-оплата отключена (заказы принимаются без неё).
YOOKASSA_SHOP_ID = env("YOOKASSA_SHOP_ID", default="")
YOOKASSA_SECRET_KEY = env("YOOKASSA_SECRET_KEY", default="")
# Ставка НДС для чека 54-ФЗ: 1 = без НДС (УСН). Справочник кодов — в доках ЮKassa.
YOOKASSA_VAT_CODE = env.int("YOOKASSA_VAT_CODE", default=1)

# --- Telegram notifications --------------------------------------------------
TELEGRAM_BOT_TOKEN = env("TELEGRAM_BOT_TOKEN", default="")
TELEGRAM_CHAT_ID = env("TELEGRAM_CHAT_ID", default="")

# --- Логирование: 500-ки → Telegram ------------------------------------------
# Только django.request (необработанные исключения вьюх). Дефолтное
# консольное логирование Django сохраняется (disable_existing_loggers=False,
# propagate=True). Троттлинг и fail-soft — в apps.core.telegram_log.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "telegram": {"format": "🚨 Ошибка на проде\n%(message)s"},
    },
    "handlers": {
        "telegram_errors": {
            "class": "apps.core.telegram_log.TelegramErrorHandler",
            "level": "ERROR",
            "formatter": "telegram",
        },
    },
    "loggers": {
        "django.request": {
            "handlers": ["telegram_errors"],
            "level": "ERROR",
            "propagate": True,
        },
    },
}

# --- OpenAPI schema (drf-spectacular) ----------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "uaartist API",
    "DESCRIPTION": "REST API интернет-магазина uaartist",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v[0-9]+",
}
