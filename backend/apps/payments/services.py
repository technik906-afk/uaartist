"""
Интеграция с ЮKassa.

Принципы:
- Ключи только в env (YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY); пусто = оплата
  отключена, API отвечает 503 — сайт продолжает принимать заказы без оплаты.
- Webhook-уведомление — только сигнал: статус ВСЕГДА перечитывается из API
  провайдера (Payment.find_one), самому телу уведомления не доверяем.
- Чек 54-ФЗ (обязателен для ООО): позиции заказа + email покупателя,
  ставка НДС из env YOOKASSA_VAT_CODE.
"""

import logging
import uuid

from django.conf import settings
from rest_framework import serializers
from yookassa import Configuration
from yookassa import Payment as YooPayment

from apps.orders.notifications import send_telegram_message

from .models import Payment

logger = logging.getLogger(__name__)


class PaymentsNotConfigured(Exception):
    """Ключи ЮKassa не заданы — оплата отключена."""


def _configure():
    if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
        raise PaymentsNotConfigured
    Configuration.configure(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY)


def _build_receipt(order) -> dict:
    items = [
        {
            "description": item.product_name[:128],
            "quantity": str(item.quantity),
            "amount": {"value": str(item.price), "currency": "RUB"},
            "vat_code": settings.YOOKASSA_VAT_CODE,
            "payment_subject": "commodity",
            "payment_mode": "full_payment",
        }
        for item in order.items.all()
    ]
    if order.delivery_cost and order.delivery_cost > 0:
        items.append(
            {
                "description": f"Доставка ({order.get_delivery_method_display()})"[:128],
                "quantity": "1",
                "amount": {"value": str(order.delivery_cost), "currency": "RUB"},
                "vat_code": settings.YOOKASSA_VAT_CODE,
                "payment_subject": "service",
                "payment_mode": "full_payment",
            }
        )
    return {"customer": {"email": order.customer_email}, "items": items}


def create_payment(order) -> Payment:
    """Создаёт платёж у провайдера; переиспользует незавершённый, если он ещё жив."""
    _configure()

    # Не плодим платежи: если последний ещё pending — сверим и вернём его.
    last = order.payments.first()  # ordering -created_at
    if last and not last.is_terminal:
        sync_payment(last)
        if not last.is_terminal and last.confirmation_url:
            return last

    yoo_payment = YooPayment.create(
        {
            "amount": {"value": str(order.total), "currency": "RUB"},
            "confirmation": {
                "type": "redirect",
                "return_url": f"{settings.FRONTEND_URL}/thank-you?order={order.pk}",
            },
            "capture": True,
            "description": f"Заказ #{order.pk} на uaartist",
            "metadata": {"order_id": str(order.pk)},
            "receipt": _build_receipt(order),
        },
        str(uuid.uuid4()),  # idempotency key попытки
    )

    return Payment.objects.create(
        order=order,
        provider_payment_id=yoo_payment.id,
        status=yoo_payment.status,
        amount=order.total,
        confirmation_url=(
            yoo_payment.confirmation.confirmation_url if yoo_payment.confirmation else ""
        ),
    )


def sync_payment(payment: Payment) -> Payment:
    """Перечитывает статус из API провайдера и обновляет платёж + заказ."""
    _configure()

    yoo_payment = YooPayment.find_one(payment.provider_payment_id)
    if yoo_payment.status == payment.status:
        return payment

    payment.status = yoo_payment.status
    payment.save(update_fields=["status", "updated_at"])

    order = payment.order
    if payment.status == Payment.Status.SUCCEEDED and order.payment_status != "paid":
        order.payment_status = "paid"
        order.save(update_fields=["payment_status", "updated_at"])
        send_telegram_message(
            f"💰 Заказ #{order.pk} оплачен: {order.total:.0f} ₽ ({order.customer_name})"
        )
    elif payment.status == Payment.Status.CANCELED and order.payment_status == "pending":
        order.payment_status = "failed"
        order.save(update_fields=["payment_status", "updated_at"])

    return payment


def handle_webhook(event_json: dict) -> bool:
    """
    Обработка уведомления ЮKassa. Тело — только подсказка, какой платёж
    проверить: статус берём из API. Незнакомые платежи молча игнорируем.
    """
    payment_id = (event_json.get("object") or {}).get("id")
    if not payment_id:
        return False

    payment = Payment.objects.filter(provider_payment_id=payment_id).first()
    if payment is None:
        logger.warning("Webhook по неизвестному платежу %s — игнорирую", payment_id)
        return False

    sync_payment(payment)
    return True


def validation_error_if_not_payable(order):
    if order.payment_status == "paid":
        raise serializers.ValidationError({"order_id": "Заказ уже оплачен."})
