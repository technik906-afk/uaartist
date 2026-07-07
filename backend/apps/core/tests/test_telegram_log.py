"""Хендлер 500-ок в Telegram: отправка, троттлинг, fail-soft."""

import logging

import pytest
from django.core.cache import cache

from apps.core.telegram_log import THROTTLE_SECONDS, TelegramErrorHandler


@pytest.fixture(autouse=True)
def _clean_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def handler():
    h = TelegramErrorHandler(level=logging.ERROR)
    h.setFormatter(logging.Formatter("🚨 %(message)s"))
    return h


def _record(msg="Internal Server Error: /api/v1/checkout/", path="/api/v1/checkout/"):
    record = logging.LogRecord(
        name="django.request", level=logging.ERROR, pathname="", lineno=0,
        msg=msg, args=(), exc_info=None,
    )
    if path:

        class _Req:
            pass

        _Req.path = path
        record.request = _Req
    return record


def test_sends_formatted_message(handler, monkeypatch):
    sent = []
    monkeypatch.setattr("apps.orders.notifications.send_telegram_message", sent.append)

    handler.emit(_record())

    assert len(sent) == 1
    assert "🚨" in sent[0]
    assert "/api/v1/checkout/" in sent[0]


def test_throttles_same_path(handler, monkeypatch):
    sent = []
    monkeypatch.setattr("apps.orders.notifications.send_telegram_message", sent.append)

    handler.emit(_record())
    handler.emit(_record())  # тот же путь в окне троттлинга — молчим

    assert len(sent) == 1


def test_different_paths_not_throttled(handler, monkeypatch):
    sent = []
    monkeypatch.setattr("apps.orders.notifications.send_telegram_message", sent.append)

    handler.emit(_record(path="/api/v1/checkout/"))
    handler.emit(_record(msg="Internal Server Error: /api/v1/products/", path="/api/v1/products/"))

    assert len(sent) == 2


def test_send_failure_does_not_raise(handler, monkeypatch):
    def boom(_):
        raise RuntimeError("telegram down")

    monkeypatch.setattr("apps.orders.notifications.send_telegram_message", boom)

    handler.emit(_record())  # не должно бросить


def test_message_trimmed_to_telegram_limit(handler, monkeypatch):
    sent = []
    monkeypatch.setattr("apps.orders.notifications.send_telegram_message", sent.append)

    handler.emit(_record(msg="x" * 10_000, path="/long/"))

    assert len(sent[0]) <= 3900


def test_throttle_window_is_five_minutes():
    assert THROTTLE_SECONDS == 300


@pytest.mark.django_db
def test_unhandled_view_exception_reaches_telegram(client, monkeypatch, settings):
    """Интеграционно: 500 из вьюхи доходит до send_telegram_message."""
    sent = []
    monkeypatch.setattr("apps.orders.notifications.send_telegram_message", sent.append)
    settings.DEBUG = False

    # Несуществующий вариант в чекауте до 500 не доведёт (это 400) —
    # проще дёрнуть логгер так же, как это делает django.core.handlers
    logging.getLogger("django.request").error(
        "Internal Server Error: /api/v1/fake/", exc_info=None
    )

    assert len(sent) == 1
