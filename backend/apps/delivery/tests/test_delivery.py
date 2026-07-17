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
CITIES_URL = "/api/v1/delivery/cities/"
POINTS_URL = "/api/v1/delivery/points/"

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


class TestEndpointProtection:
    """Эндпоинты — прокси к API СДЭК: кэш справочников + троттлинг против абьюза."""

    CITY = [{"code": 44, "full_name": "Москва"}]
    POINT = [{"code": "MSK1", "name": "ПВЗ", "location": {"address_full": "ул. А, 1"}}]

    def test_cities_cached(self, api, monkeypatch, db):
        calls = []
        monkeypatch.setattr(
            "apps.delivery.services.cdek._get",
            lambda path, params: calls.append(path) or self.CITY,
        )
        first = api.get(CITIES_URL, {"q": "Мос"})
        second = api.get(CITIES_URL, {"q": "Мос"})
        assert first.json() == second.json() == self.CITY
        assert len(calls) == 1  # второй ответ из кэша

    def test_points_cached(self, api, monkeypatch, db):
        calls = []
        monkeypatch.setattr(
            "apps.delivery.services.cdek._get",
            lambda path, params: calls.append(path) or self.POINT,
        )
        api.get(POINTS_URL, {"city_code": 44})
        response = api.get(POINTS_URL, {"city_code": 44})
        assert response.json()[0]["address"] == "ул. А, 1"
        assert len(calls) == 1

    def test_cities_failure_not_cached(self, api, monkeypatch, db):
        from apps.delivery.services.cdek import CdekUnavailable

        def boom(path, params):
            raise CdekUnavailable("down")

        monkeypatch.setattr("apps.delivery.services.cdek._get", boom)
        assert api.get(CITIES_URL, {"q": "Мос"}).json() == []
        # СДЭК ожил — следующий запрос должен уйти в API, а не в кэш ошибки
        monkeypatch.setattr("apps.delivery.services.cdek._get", lambda path, params: self.CITY)
        assert api.get(CITIES_URL, {"q": "Мос"}).json() == self.CITY

    @pytest.fixture
    def _tight_rates(self, monkeypatch):
        # Подмена DEFAULT_THROTTLE_RATES не работает: DRF захватывает словарь
        # в SimpleRateThrottle.THROTTLE_RATES при импорте. Подменяем rate класса.
        from apps.delivery.views import DeliveryQuoteThrottle, DeliveryThrottle

        monkeypatch.setattr(DeliveryThrottle, "rate", "2/hour", raising=False)
        monkeypatch.setattr(DeliveryQuoteThrottle, "rate", "2/hour", raising=False)

    def test_cities_throttled(self, api, monkeypatch, db, _tight_rates):
        monkeypatch.setattr("apps.delivery.services.cdek.suggest_cities", lambda q: [])
        # разные q — мимо кэша: лимит должен сработать сам по себе
        statuses = [api.get(CITIES_URL, {"q": f"аб{i}"}).status_code for i in range(3)]
        assert statuses == [200, 200, 429]

    def test_quote_throttled(self, api, monkeypatch, db, _tight_rates):
        monkeypatch.setattr("apps.delivery.quotes.quote_all", lambda c, p, w: [])
        payload = {"postcode": "101000", "items": [{"custom": {}, "quantity": 1}]}
        statuses = [
            api.post(QUOTE_URL, payload, format="json").status_code for _ in range(3)
        ]
        assert statuses == [200, 200, 429]


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
