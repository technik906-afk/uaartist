"""Auth: регистрация, логин, профиль, история заказов, привязка заказа, email."""

from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product, ProductVariant
from apps.orders.models import Order

REGISTER_URL = "/api/v1/auth/register/"
TOKEN_URL = "/api/v1/auth/token/"
ME_URL = "/api/v1/auth/me/"
MY_ORDERS_URL = "/api/v1/orders/my/"

CREDENTIALS = {
    "email": "user@example.com",
    "password": "Str0ng-Pass-2026",
    "name": "Лев",
    "phone": "+7 900 111-22-33",
    "consent": True,
}


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture(autouse=True)
def _clear_throttle():
    cache.clear()


@pytest.fixture(autouse=True)
def _mute_telegram(monkeypatch):
    monkeypatch.setattr("apps.orders.notifications.send_telegram_message", lambda text: True)


@pytest.fixture
def variant(db):
    category = Category.objects.create(name="Косметички", slug="kosmetichki")
    product = Product.objects.create(category=category, name="Косметичка «Беж»", slug="bezh")
    return ProductVariant.objects.create(
        product=product, sku="BEZH-1", price=Decimal("2490"), stock=5
    )


def register(api, **overrides):
    return api.post(REGISTER_URL, {**CREDENTIALS, **overrides}, format="json")


class TestRegister:
    def test_register_returns_tokens(self, api, db):
        response = register(api)
        assert response.status_code == 201
        data = response.json()
        assert "access" in data and "refresh" in data
        user = User.objects.get(username=CREDENTIALS["email"])
        assert user.email == CREDENTIALS["email"]

    def test_duplicate_email_400(self, api, db):
        register(api)
        assert register(api).status_code == 400

    def test_weak_password_400(self, api, db):
        assert register(api, password="123").status_code == 400

    def test_email_lowercased(self, api, db):
        register(api, email="MiXeD@Example.COM")
        assert User.objects.filter(username="mixed@example.com").exists()

    def test_name_and_phone_saved(self, api, db):
        register(api)
        user = User.objects.get(username=CREDENTIALS["email"])
        assert user.first_name == "Лев"
        assert user.profile.phone == "+7 900 111-22-33"
        assert user.profile.personal_data_consent_at is not None

    def test_without_consent_400(self, api, db):
        response = register(api, consent=False)
        assert response.status_code == 400
        assert "согласие" in str(response.json()).lower()

    def test_missing_consent_field_400(self, api, db):
        payload = {k: v for k, v in CREDENTIALS.items() if k != "consent"}
        assert api.post(REGISTER_URL, payload, format="json").status_code == 400

    def test_bad_phone_400(self, api, db):
        assert register(api, phone="не телефон").status_code == 400


class TestLoginAndMe:
    def test_token_obtain_with_email_as_username(self, api, db):
        register(api)
        response = api.post(
            TOKEN_URL,
            {"username": CREDENTIALS["email"], "password": CREDENTIALS["password"]},
            format="json",
        )
        assert response.status_code == 200
        assert "access" in response.json()

    def test_me_requires_auth(self, api, db):
        assert api.get(ME_URL).status_code == 401

    def test_me_returns_profile(self, api, db):
        access = register(api).json()["access"]
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        data = api.get(ME_URL).json()
        assert data["email"] == CREDENTIALS["email"]
        assert data["first_name"] == "Лев"
        assert data["phone"] == "+7 900 111-22-33"


class TestOrderBinding:
    def _checkout(self, api, variant):
        from conftest import DELIVERY_PAYLOAD

        return api.post(
            "/api/v1/orders/",
            {
                "customer": {"name": "Анна", "phone": "+7 900 000-00-00", "email": "a@b.io"},
                "items": [{"variant_id": variant.pk, "quantity": 1}],
                "delivery": DELIVERY_PAYLOAD,
            },
            format="json",
        )

    def test_authenticated_checkout_binds_user(self, api, variant):
        access = register(api).json()["access"]
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        assert self._checkout(api, variant).status_code == 201
        order = Order.objects.get()
        assert order.user is not None
        assert order.user.username == CREDENTIALS["email"]

    def test_guest_checkout_still_works(self, api, variant):
        assert self._checkout(api, variant).status_code == 201
        assert Order.objects.get().user is None

    def test_my_orders_only_own(self, api, variant):
        # чужой заказ (гостевой)
        self._checkout(api, variant)
        # свой заказ
        access = register(api).json()["access"]
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self._checkout(api, variant)

        data = api.get(MY_ORDERS_URL).json()
        assert data["count"] == 1  # только свой, гостевой не виден

    def test_my_orders_requires_auth(self, api, db):
        assert api.get(MY_ORDERS_URL).status_code == 401


class TestOrderEmail:
    def test_confirmation_email_sent(self, api, variant, mailoutbox):
        TestOrderBinding._checkout(self, api, variant)
        order = Order.objects.get()
        assert len(mailoutbox) == 1
        email = mailoutbox[0]
        assert email.to == ["a@b.io"]
        # PK не сбрасывается между тестами (sequence) — сверяем с фактическим
        assert f"#{order.pk}" in email.subject
        assert "Косметичка «Беж»" in email.body
