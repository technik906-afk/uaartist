"""Общие фикстуры бэкенда."""

from decimal import Decimal

import pytest

# Типовой блок доставки для чекаут-тестов (Почта: индекс обязателен).
DELIVERY_PAYLOAD = {
    "method": "post",
    "city_name": "Москва",
    "postcode": "101000",
    "address": "ул. Тестовая, д. 1, кв. 2",
}


@pytest.fixture(autouse=True)
def _mock_delivery_pricing(monkeypatch):
    """
    Не ходим в API перевозчиков из тестов. Цена доставки = 0, чтобы суммы
    в существующих тестах не менялись; математика доставки проверяется
    отдельно в apps/delivery/tests (с явным переопределением мока).
    """
    monkeypatch.setattr(
        "apps.delivery.quotes.price_for_method",
        lambda method, city_code, postcode, weight_grams: Decimal("0"),
    )
