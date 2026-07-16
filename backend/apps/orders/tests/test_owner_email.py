"""Email-дубль уведомления владельцу о новом заказе."""

from decimal import Decimal

import pytest
from django.core import mail

from apps.orders.notifications import notify_owner_email


@pytest.fixture
def order(django_user_model):
    # Лёгкая заглушка вместо полного заказа: notify_owner_email читает
    # только items/delivery/total/customer_* — используем реальный заказ из БД
    from apps.orders.models import Order

    return Order.objects.create(
        customer_name="Тест",
        customer_phone="+79990001122",
        customer_email="buyer@example.com",
        total=Decimal("2890.00"),
    )


@pytest.mark.django_db
def test_sends_email_to_owner(order, settings):
    settings.ORDER_NOTIFY_EMAIL = "owner@example.com"

    assert notify_owner_email(order) is True
    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.to == ["owner@example.com"]
    assert f"заказ #{order.pk}" in message.subject.lower()
    assert "2890" in message.subject
    assert "buyer@example.com" in message.body


@pytest.mark.django_db
def test_disabled_when_email_not_configured(order, settings):
    settings.ORDER_NOTIFY_EMAIL = ""

    assert notify_owner_email(order) is False
    assert mail.outbox == []


@pytest.mark.django_db
def test_smtp_failure_does_not_raise(order, settings, monkeypatch):
    settings.ORDER_NOTIFY_EMAIL = "owner@example.com"

    def boom(*args, **kwargs):
        raise ConnectionError("smtp down")

    monkeypatch.setattr("apps.orders.notifications.send_mail", boom)
    assert notify_owner_email(order) is False  # не бросает, заказ не валится
