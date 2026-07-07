"""
500-ки прода → Telegram (лёгкая замена трекеру ошибок до появления GlitchTip).

Вешается ТОЛЬКО на логгер django.request (см. LOGGING в settings): более
широкий логгер зациклился бы — сбой самой отправки пишет в лог notifications.
"""

import hashlib
import logging

from django.core.cache import cache

# Один и тот же путь не чаще раза в 5 минут — шторм ошибок не зальёт чат
# (Telegram-лимит ~20 сообщений/мин, да и читать это невозможно).
THROTTLE_SECONDS = 300
MAX_MESSAGE_LEN = 3900  # лимит Telegram 4096, оставляем запас на заголовок


class TelegramErrorHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            # Ленивый импорт: настройка логирования происходит до загрузки приложений
            from apps.orders.notifications import send_telegram_message

            request = getattr(record, "request", None)
            path = getattr(request, "path", "") or record.getMessage()[:80]
            # Хешируем: в пути/сообщении бывают недопустимые для ключа символы
            key = "tg_err:" + hashlib.md5(path.encode()).hexdigest()
            if not cache.add(key, 1, THROTTLE_SECONDS):
                return  # об этом пути уже сообщали недавно
            send_telegram_message(self.format(record)[:MAX_MESSAGE_LEN])
        except Exception:  # noqa: BLE001
            pass  # обработчик логов не имеет права ронять обработку запроса
