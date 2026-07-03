"""Checkout: server pricing, stock atomicity, validation, notifications."""

from decimal import Decimal

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product, ProductVariant
from apps.orders.models import Order, OrderItem

# Оригинал захватываем до того, как autouse-фикстура подменит атрибут модуля.
from apps.orders.notifications import send_telegram_message as real_send_telegram

CHECKOUT_URL = "/api/v1/orders/"

CUSTOMER = {"name": "Анна", "phone": "+7 900 123-45-67", "email": "anna@example.com"}


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture(autouse=True)
def _no_throttle_between_tests():
    cache.clear()  # счётчики троттлинга не перетекают между тестами


@pytest.fixture(autouse=True)
def tg_sent(monkeypatch):
    """Телеграм замокан во всех тестах; фиксируем отправленные сообщения."""
    sent = []
    monkeypatch.setattr(
        "apps.orders.notifications.send_telegram_message",
        lambda text: sent.append(text) or True,
    )
    return sent


@pytest.fixture
def variant(db):
    category = Category.objects.create(name="Косметички", slug="kosmetichki")
    product = Product.objects.create(category=category, name="Косметичка «Беж»", slug="bezh")
    return ProductVariant.objects.create(
        product=product, sku="BEZH-1", price=Decimal("2490"), stock=5
    )


def checkout(api, items, customer=CUSTOMER):
    return api.post(CHECKOUT_URL, {"customer": customer, "items": items}, format="json")


class TestHappyPath:
    def test_order_created_with_server_prices(self, api, variant):
        response = checkout(api, [{"variant_id": variant.pk, "quantity": 2}])
        assert response.status_code == 201, response.json()
        data = response.json()
        assert Decimal(data["total"]) == Decimal("4980.00")
        assert data["status"] == "new"
        assert data["payment_status"] == "pending"
        assert data["items"][0]["product_name"] == "Косметичка «Беж»"

    def test_stock_decremented(self, api, variant):
        checkout(api, [{"variant_id": variant.pk, "quantity": 2}])
        variant.refresh_from_db()
        assert variant.stock == 3

    def test_price_frozen_in_order_item(self, api, variant):
        checkout(api, [{"variant_id": variant.pk}])
        item = OrderItem.objects.get()
        variant.price = Decimal("9999")
        variant.save()
        item.refresh_from_db()
        assert item.price == Decimal("2490.00")  # цена в заказе не меняется

    def test_client_price_is_ignored(self, api, variant):
        response = checkout(api, [{"variant_id": variant.pk, "quantity": 1, "price": "1.00"}])
        assert response.status_code == 201
        assert Decimal(response.json()["total"]) == Decimal("2490.00")

    def test_guest_checkout_no_user(self, api, variant):
        checkout(api, [{"variant_id": variant.pk}])
        assert Order.objects.get().user is None

    def test_telegram_notified(self, api, variant, tg_sent):
        checkout(api, [{"variant_id": variant.pk}])
        assert len(tg_sent) == 1
        assert "Косметичка «Беж»" in tg_sent[0]
        assert "Анна" in tg_sent[0]


class TestCustomItems:
    def test_custom_priced_on_server(self, api, db):
        config = {"size": "medium", "bag_color": "sage", "zipper_color": "gold", "tassel": True}
        response = checkout(api, [{"custom": config, "quantity": 1}])
        assert response.status_code == 201
        assert Decimal(response.json()["total"]) == Decimal("3090")  # 2890 + 200
        item = OrderItem.objects.get()
        assert item.custom_config["size"] == "medium"
        assert item.variant is None
        assert "Стандарт" in item.product_name

    def test_custom_without_tassel(self, api, db):
        config = {"size": "small", "bag_color": "beige", "zipper_color": "black"}
        response = checkout(api, [{"custom": config}])
        assert Decimal(response.json()["total"]) == Decimal("2490")

    def test_invalid_size_rejected(self, api, db):
        config = {"size": "giant", "bag_color": "beige", "zipper_color": "gold"}
        assert checkout(api, [{"custom": config}]).status_code == 400

    def test_mixed_order(self, api, variant):
        config = {"size": "large", "bag_color": "white", "zipper_color": "silver"}
        response = checkout(
            api,
            [{"variant_id": variant.pk, "quantity": 1}, {"custom": config, "quantity": 2}],
        )
        assert response.status_code == 201
        assert Decimal(response.json()["total"]) == Decimal("2490") + Decimal("3490") * 2


class TestStockAndAtomicity:
    def test_insufficient_stock_400(self, api, variant):
        response = checkout(api, [{"variant_id": variant.pk, "quantity": 10}])
        assert response.status_code == 400
        assert "осталось 5" in str(response.json())

    def test_failed_order_leaves_no_traces(self, api, variant):
        """Нехватка по одной позиции откатывает ВСЁ: ни заказа, ни списаний."""
        category2 = Category.objects.create(name="Сумки", slug="sumki")
        product2 = Product.objects.create(category=category2, name="Шоппер", slug="shopper")
        variant2 = ProductVariant.objects.create(
            product=product2, sku="SHOP-1", price=Decimal("4500"), stock=10
        )
        response = checkout(
            api,
            [
                {"variant_id": variant2.pk, "quantity": 3},  # хватает
                {"variant_id": variant.pk, "quantity": 99},  # не хватает
            ],
        )
        assert response.status_code == 400
        assert Order.objects.count() == 0
        assert OrderItem.objects.count() == 0
        variant2.refresh_from_db()
        assert variant2.stock == 10  # списание откатилось

    def test_unknown_variant_400(self, api, db):
        assert checkout(api, [{"variant_id": 424242}]).status_code == 400

    def test_inactive_variant_400(self, api, variant):
        variant.is_active = False
        variant.save()
        assert checkout(api, [{"variant_id": variant.pk}]).status_code == 400

    def test_inactive_product_400(self, api, variant):
        variant.product.is_active = False
        variant.product.save()
        assert checkout(api, [{"variant_id": variant.pk}]).status_code == 400

    def test_no_notification_on_failure(self, api, variant, tg_sent):
        checkout(api, [{"variant_id": variant.pk, "quantity": 99}])
        assert tg_sent == []


class TestValidation:
    def test_item_with_both_variant_and_custom(self, api, variant):
        config = {"size": "small", "bag_color": "beige", "zipper_color": "gold"}
        response = checkout(api, [{"variant_id": variant.pk, "custom": config}])
        assert response.status_code == 400

    def test_item_with_neither(self, api, db):
        assert checkout(api, [{"quantity": 1}]).status_code == 400

    def test_empty_items(self, api, db):
        assert checkout(api, []).status_code == 400

    def test_zero_quantity(self, api, variant):
        assert checkout(api, [{"variant_id": variant.pk, "quantity": 0}]).status_code == 400

    def test_bad_phone(self, api, variant):
        customer = {**CUSTOMER, "phone": "не телефон!"}
        assert checkout(api, [{"variant_id": variant.pk}], customer).status_code == 400

    def test_bad_email(self, api, variant):
        customer = {**CUSTOMER, "email": "not-an-email"}
        assert checkout(api, [{"variant_id": variant.pk}], customer).status_code == 400

    def test_orders_not_listable(self, api, db):
        assert api.get(CHECKOUT_URL).status_code in (403, 405)


class TestNotificationsModule:
    """Прямые тесты notifications.py с мокнутым requests (без autouse-мока)."""

    def test_network_failure_returns_false_not_raises(self, settings, monkeypatch, db):
        """Сбой сети не поднимает исключение — заказ не пострадает."""
        import requests as requests_lib

        settings.TELEGRAM_BOT_TOKEN = "TEST_TOKEN"
        settings.TELEGRAM_CHAT_ID = "123"

        def raise_connection_error(*args, **kwargs):
            raise requests_lib.ConnectionError("сеть лежит")

        monkeypatch.setattr(requests_lib, "post", raise_connection_error)
        assert real_send_telegram("test") is False  # False, а не исключение

    def test_disabled_without_token(self, settings, db):
        settings.TELEGRAM_BOT_TOKEN = ""
        assert real_send_telegram("test") is False

    def test_sends_when_configured(self, settings, monkeypatch, db):
        import requests as requests_lib

        settings.TELEGRAM_BOT_TOKEN = "TEST_TOKEN"
        settings.TELEGRAM_CHAT_ID = "123"
        calls = {}

        class FakeResponse:
            def raise_for_status(self):
                pass

        def fake_post(url, json, timeout):
            calls["url"] = url
            calls["json"] = json
            return FakeResponse()

        monkeypatch.setattr(requests_lib, "post", fake_post)
        assert real_send_telegram("привет") is True
        assert "TEST_TOKEN" in calls["url"]
        assert calls["json"]["text"] == "привет"
