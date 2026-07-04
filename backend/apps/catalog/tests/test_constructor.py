"""Конструктор: опции из БД, влияние цен БД на заказ, недоступные опции."""

from decimal import Decimal

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.catalog.models import ConstructorOption

OPTIONS_URL = "/api/v1/constructor/options/"
ORDERS_URL = "/api/v1/orders/"

CUSTOMER = {"name": "Анна", "phone": "+7 900 123-45-67", "email": "anna@example.com"}
CONFIG = {"size": "medium", "bag_color": "sage", "zipper_color": "gold", "tassel": True}


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture(autouse=True)
def _clear_throttle():
    cache.clear()


@pytest.fixture(autouse=True)
def _mute_notifications(monkeypatch):
    monkeypatch.setattr("apps.orders.notifications.send_telegram_message", lambda text: True)


def checkout_custom(api, config=CONFIG, quantity=1):
    return api.post(
        ORDERS_URL,
        {"customer": CUSTOMER, "items": [{"custom": config, "quantity": quantity}]},
        format="json",
    )


class TestOptionsEndpoint:
    def test_groups_and_seeded_values(self, api, db):
        data = api.get(OPTIONS_URL).json()
        assert set(data) == {"sizes", "bag_colors", "zipper_colors", "addons"}
        sizes = {o["slug"]: o for o in data["sizes"]}
        assert Decimal(sizes["medium"]["price"]) == Decimal("2890")
        assert len(data["bag_colors"]) == 6
        assert data["bag_colors"][0]["color_hex"].startswith("#")
        addons = {o["slug"] for o in data["addons"]}
        assert "tassel" in addons

    def test_inactive_options_hidden(self, api, db):
        ConstructorOption.objects.filter(slug="olive").update(is_active=False)
        data = api.get(OPTIONS_URL).json()
        assert "olive" not in {o["slug"] for o in data["bag_colors"]}


class TestDbDrivenPricing:
    def test_order_priced_from_db(self, api, db):
        response = checkout_custom(api)
        assert response.status_code == 201
        assert Decimal(response.json()["total"]) == Decimal("3090")  # 2890 + 200

    def test_price_change_in_db_affects_new_orders(self, api, db):
        ConstructorOption.objects.filter(option_type="size", slug="medium").update(price=5000)
        ConstructorOption.objects.filter(option_type="addon", slug="tassel").update(price=500)
        response = checkout_custom(api)
        assert Decimal(response.json()["total"]) == Decimal("5500")

    def test_color_surcharge_added(self, api, db):
        ConstructorOption.objects.filter(option_type="bag_color", slug="sage").update(price=150)
        response = checkout_custom(api)
        assert Decimal(response.json()["total"]) == Decimal("3240")  # 2890 + 150 + 200

    def test_unknown_slug_400(self, api, db):
        response = checkout_custom(api, {**CONFIG, "size": "giant"})
        assert response.status_code == 400
        assert "giant" in str(response.json())

    def test_inactive_option_400(self, api, db):
        ConstructorOption.objects.filter(option_type="size", slug="medium").update(is_active=False)
        assert checkout_custom(api).status_code == 400

    def test_display_name_from_db(self, api, db):
        ConstructorOption.objects.filter(option_type="size", slug="medium").update(name="Средний+")
        response = checkout_custom(api)
        assert "Средний+" in response.json()["items"][0]["product_name"]
