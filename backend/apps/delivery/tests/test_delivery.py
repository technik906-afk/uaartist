"""Доставка: вес корзины, котировки, серверный пересчёт в заказе, чек."""

from decimal import Decimal

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product, ProductVariant
from apps.delivery import quotes
from apps.orders.models import Order

CHECKOUT_URL = "/api/v1/orders/"
QUOTE_URL = "/api/v1/delivery/quote/"

CUSTOMER = {"name": "Анна", "phone": "+7 900 123-45-67", "email": "anna@example.com"}


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture(autouse=True)
def _clear(monkeypatch):
    cache.clear()
    monkeypatch.setattr("apps.orders.notifications.send_telegram_message", lambda text: True)


@pytest.fixture
def variant(db):
    category = Category.objects.create(name="Косметички", slug="kosmetichki")
    product = Product.objects.create(category=category, name="Косметичка «Беж»", slug="bezh")
    return ProductVariant.objects.create(
        product=product, sku="BEZH-1", price=Decimal("2490"), stock=5, weight_grams=250
    )


class TestCartWeight:
    def test_sums_variant_weights(self, variant):
        weight = quotes.cart_weight_grams([{"variant_id": variant.pk, "quantity": 3}])
        assert weight == 750

    def test_custom_items_use_default(self, db):
        weight = quotes.cart_weight_grams([{"custom": {"size": "small"}, "quantity": 2}])
        assert weight == 600

    def test_minimum_100g(self, db):
        assert quotes.cart_weight_grams([]) == 100


class TestQuoteAll:
    def test_combines_carriers(self, monkeypatch, db):
        monkeypatch.setattr(
            "apps.delivery.services.cdek.calc_tariffs",
            lambda city, w: {
                136: {"price": 295, "period_min": 2, "period_max": 3},
                137: {"price": 545, "period_min": 2, "period_max": 3},
            },
        )
        monkeypatch.setattr(
            "apps.delivery.services.pochta.calc_tariff", lambda pc, w: {"price": 265}
        )
        result = quotes.quote_all(44, "101000", 300)
        methods = {q["method"]: q["price"] for q in result}
        assert methods == {"cdek_pvz": 295, "cdek_courier": 545, "post": 265}

    def test_carrier_failure_drops_method(self, monkeypatch, db):
        from apps.delivery.services.cdek import CdekUnavailable

        def boom(city, w):
            raise CdekUnavailable("down")

        monkeypatch.setattr("apps.delivery.services.cdek.calc_tariffs", boom)
        monkeypatch.setattr(
            "apps.delivery.services.pochta.calc_tariff", lambda pc, w: {"price": 265}
        )
        result = quotes.quote_all(44, "101000", 300)
        assert [q["method"] for q in result] == ["post"]  # СДЭК выпал, Почта жива


class TestCheckoutWithDelivery:
    """Переопределяем глобальный мок: цена доставки 250 ₽."""

    @pytest.fixture(autouse=True)
    def _price(self, monkeypatch):
        monkeypatch.setattr(
            "apps.delivery.quotes.price_for_method",
            lambda method, city_code, postcode, weight_grams: Decimal("250"),
        )

    def checkout(self, api, variant, delivery):
        return api.post(
            CHECKOUT_URL,
            {
                "customer": CUSTOMER,
                "items": [{"variant_id": variant.pk, "quantity": 1}],
                "delivery": delivery,
            },
            format="json",
        )

    def test_total_includes_delivery(self, api, variant):
        response = self.checkout(
            api,
            variant,
            {"method": "post", "city_name": "Москва", "postcode": "101000", "address": "ул. А, 1"},
        )
        assert response.status_code == 201, response.json()
        data = response.json()
        assert Decimal(data["total"]) == Decimal("2740")  # 2490 + 250
        assert data["delivery_method"] == "post"
        assert Decimal(data["delivery_cost"]) == Decimal("250")

    def test_delivery_snapshot_saved(self, api, variant):
        self.checkout(
            api,
            variant,
            {
                "method": "cdek_pvz",
                "city_code": 44,
                "city_name": "Москва",
                "pvz_code": "MSK123",
                "pvz_address": "ул. Ленина, 1",
            },
        )
        order = Order.objects.get()
        assert order.delivery_pvz_code == "MSK123"
        assert order.delivery_city == "Москва"

    def test_pvz_method_requires_pvz_code(self, api, variant):
        response = self.checkout(
            api, variant, {"method": "cdek_pvz", "city_code": 44, "city_name": "Москва"}
        )
        assert response.status_code == 400

    def test_post_requires_postcode(self, api, variant):
        response = self.checkout(
            api, variant, {"method": "post", "city_name": "Москва", "address": "ул. А, 1"}
        )
        assert response.status_code == 400

    def test_courier_requires_address(self, api, variant):
        response = self.checkout(
            api, variant, {"method": "cdek_courier", "city_code": 44, "city_name": "Москва"}
        )
        assert response.status_code == 400

    def test_unavailable_delivery_rejects_order(self, api, variant, monkeypatch):
        monkeypatch.setattr(
            "apps.delivery.quotes.price_for_method",
            lambda method, city_code, postcode, weight_grams: None,
        )
        response = self.checkout(
            api,
            variant,
            {"method": "post", "city_name": "Москва", "postcode": "101000", "address": "ул. А, 1"},
        )
        assert response.status_code == 400
        assert Order.objects.count() == 0

    def test_receipt_includes_delivery_line(self, api, variant, settings):
        settings.YOOKASSA_VAT_CODE = 1
        self.checkout(
            api,
            variant,
            {"method": "post", "city_name": "Москва", "postcode": "101000", "address": "ул. А, 1"},
        )
        from apps.payments.services import _build_receipt

        receipt = _build_receipt(Order.objects.get())
        assert len(receipt["items"]) == 2
        delivery_line = receipt["items"][1]
        assert delivery_line["payment_subject"] == "service"
        assert delivery_line["amount"]["value"] == "250.00"
