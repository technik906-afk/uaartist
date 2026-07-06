"""Платежи ЮKassa: создание с чеком, поллинг, webhook, переходы статусов."""

from decimal import Decimal
from types import SimpleNamespace

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product, ProductVariant
from apps.orders.models import Order
from apps.payments.models import Payment

CREATE_URL = "/api/v1/payments/create/"
STATUS_URL = "/api/v1/payments/status/"
WEBHOOK_URL = "/api/v1/payments/yookassa/webhook/"

CUSTOMER = {"name": "Анна", "phone": "+7 900 123-45-67", "email": "anna@example.com"}


def fake_yoo_payment(payment_id="yoo-123", status="pending", url="https://yookassa.test/pay"):
    return SimpleNamespace(
        id=payment_id,
        status=status,
        confirmation=SimpleNamespace(confirmation_url=url) if url else None,
    )


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture(autouse=True)
def _clear_throttle():
    cache.clear()


@pytest.fixture(autouse=True)
def _yookassa_configured(settings):
    settings.YOOKASSA_SHOP_ID = "test-shop"
    settings.YOOKASSA_SECRET_KEY = "test-secret"


@pytest.fixture(autouse=True)
def tg_sent(monkeypatch):
    sent = []
    monkeypatch.setattr(
        "apps.orders.notifications.send_telegram_message", lambda text: sent.append(text) or True
    )
    # services.py импортирует функцию напрямую — мокаем и там
    monkeypatch.setattr(
        "apps.payments.services.send_telegram_message", lambda text: sent.append(text) or True
    )
    return sent


@pytest.fixture
def yoo(monkeypatch):
    """Мок SDK: собирает вызовы create/find_one."""
    calls = {"create": [], "find_one": []}

    class FakeYooPayment:
        _find_result = fake_yoo_payment()

        @staticmethod
        def create(payload, idempotency_key=None):
            calls["create"].append(payload)
            # реальная ЮKassa выдаёт новый id на каждый платёж
            return fake_yoo_payment(payment_id=f"yoo-{123 + len(calls['create']) - 1}")

        @staticmethod
        def find_one(payment_id):
            calls["find_one"].append(payment_id)
            return FakeYooPayment._find_result

    monkeypatch.setattr("apps.payments.services.YooPayment", FakeYooPayment)
    monkeypatch.setattr(
        "apps.payments.services.Configuration",
        SimpleNamespace(configure=lambda *a, **kw: None),
    )
    calls["cls"] = FakeYooPayment
    return calls


@pytest.fixture
def order(db):
    category = Category.objects.create(name="Косметички", slug="kosmetichki")
    product = Product.objects.create(category=category, name="Косметичка «Беж»", slug="bezh")
    variant = ProductVariant.objects.create(
        product=product, sku="BEZH-1", price=Decimal("2490"), stock=5
    )
    api = APIClient()
    response = api.post(
        "/api/v1/orders/",
        {"customer": CUSTOMER, "items": [{"variant_id": variant.pk, "quantity": 2}]},
        format="json",
    )
    assert response.status_code == 201
    return Order.objects.get(pk=response.json()["id"])


def create_payment(api, order, email=None):
    return api.post(
        CREATE_URL,
        {"order_id": order.pk, "email": email or order.customer_email},
        format="json",
    )


class TestCreatePayment:
    def test_happy_path(self, api, order, yoo):
        response = create_payment(api, order)
        assert response.status_code == 201, response.json()
        data = response.json()
        assert data["confirmation_url"] == "https://yookassa.test/pay"
        assert Payment.objects.filter(order=order, provider_payment_id="yoo-123").exists()

    def test_payload_has_amount_and_receipt(self, api, order, yoo):
        create_payment(api, order)
        payload = yoo["create"][0]
        assert payload["amount"]["value"] == "4980.00"  # 2490 × 2, сумма сервера
        assert payload["capture"] is True
        assert payload["metadata"]["order_id"] == str(order.pk)
        receipt = payload["receipt"]
        assert receipt["customer"]["email"] == order.customer_email
        assert len(receipt["items"]) == 1
        item = receipt["items"][0]
        assert item["quantity"] == "2"
        assert item["vat_code"] == 1
        assert "thank-you?order=" in payload["confirmation"]["return_url"]

    def test_wrong_email_404(self, api, order, yoo):
        assert create_payment(api, order, email="hacker@evil.io").status_code == 404
        assert yoo["create"] == []

    def test_already_paid_400(self, api, order, yoo):
        order.payment_status = "paid"
        order.save()
        assert create_payment(api, order).status_code == 400

    def test_not_configured_503(self, api, order, settings):
        settings.YOOKASSA_SHOP_ID = ""
        assert create_payment(api, order).status_code == 503

    def test_pending_payment_reused(self, api, order, yoo):
        create_payment(api, order)
        response = create_payment(api, order)
        assert response.status_code == 201
        assert Payment.objects.filter(order=order).count() == 1  # не наплодили
        assert len(yoo["create"]) == 1
        assert len(yoo["find_one"]) == 1  # но статус пересверили

    def test_new_payment_after_canceled(self, api, order, yoo):
        create_payment(api, order)
        yoo["cls"]._find_result = fake_yoo_payment(status="canceled")
        response = create_payment(api, order)
        assert response.status_code == 201
        assert Payment.objects.filter(order=order).count() == 2  # новая попытка


class TestStatusPolling:
    def test_status_syncs_and_marks_paid(self, api, order, yoo, tg_sent):
        create_payment(api, order)
        yoo["cls"]._find_result = fake_yoo_payment(status="succeeded")

        response = api.get(STATUS_URL, {"order_id": order.pk, "email": order.customer_email})
        assert response.status_code == 200
        data = response.json()
        assert data["payment_status"] == "paid"
        assert data["payment"]["status"] == "succeeded"
        order.refresh_from_db()
        assert order.payment_status == "paid"
        assert any("Оплачен" in m or "оплачен" in m for m in tg_sent)

    def test_paid_notification_sent_once(self, api, order, yoo, tg_sent):
        create_payment(api, order)
        yoo["cls"]._find_result = fake_yoo_payment(status="succeeded")
        api.get(STATUS_URL, {"order_id": order.pk, "email": order.customer_email})
        paid_messages = [m for m in tg_sent if "оплачен" in m.lower()]
        api.get(STATUS_URL, {"order_id": order.pk, "email": order.customer_email})
        assert [m for m in tg_sent if "оплачен" in m.lower()] == paid_messages  # без дублей

    def test_canceled_marks_failed(self, api, order, yoo):
        create_payment(api, order)
        yoo["cls"]._find_result = fake_yoo_payment(status="canceled")
        api.get(STATUS_URL, {"order_id": order.pk, "email": order.customer_email})
        order.refresh_from_db()
        assert order.payment_status == "failed"

    def test_wrong_email_404(self, api, order, yoo):
        response = api.get(STATUS_URL, {"order_id": order.pk, "email": "x@y.io"})
        assert response.status_code == 404


class TestWebhook:
    def test_succeeded_event_marks_paid(self, api, order, yoo):
        create_payment(api, order)
        yoo["cls"]._find_result = fake_yoo_payment(status="succeeded")

        response = api.post(
            WEBHOOK_URL,
            {"type": "notification", "event": "payment.succeeded", "object": {"id": "yoo-123"}},
            format="json",
        )
        assert response.status_code == 200
        order.refresh_from_db()
        assert order.payment_status == "paid"
        # статус перечитан из API, а не взят из тела уведомления
        assert yoo["find_one"][-1] == "yoo-123"

    def test_unknown_payment_still_200(self, api, db, yoo):
        response = api.post(
            WEBHOOK_URL,
            {"type": "notification", "event": "payment.succeeded", "object": {"id": "ghost"}},
            format="json",
        )
        assert response.status_code == 200

    def test_garbage_body_still_200(self, api, db):
        assert api.post(WEBHOOK_URL, {"lol": "kek"}, format="json").status_code == 200
