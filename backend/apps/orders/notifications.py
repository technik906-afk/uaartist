"""Order notifications. Telegram token lives in .env — NEVER on the client."""

import logging

import requests
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_order_email(order) -> bool:
    """Письмо-подтверждение покупателю. Сбой не валит заказ."""
    lines = [f"Здравствуйте, {order.customer_name}!", "", f"Ваш заказ #{order.pk} принят:", ""]
    for item in order.items.all():
        lines.append(f"— {item.product_name} × {item.quantity} = {item.line_total:.0f} ₽")
    lines += [
        "",
        f"Итого: {order.total:.0f} ₽",
        "",
        "Мы свяжемся с вами для подтверждения.",
        "",
        "uaartist",
    ]
    try:
        send_mail(
            subject=f"uaartist: заказ #{order.pk} принят",
            message="\n".join(lines),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[order.customer_email],
        )
        return True
    except Exception:
        logger.exception("Не удалось отправить email-подтверждение заказа #%s", order.pk)
        return False


def send_telegram_message(text: str) -> bool:
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID
    if not token or not chat_id:
        logger.info("Telegram не настроен (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) — пропускаю")
        return False
    try:
        response = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=10,
        )
        response.raise_for_status()
        return True
    except requests.RequestException:
        logger.exception("Не удалось отправить уведомление в Telegram")
        return False


def _order_summary(order) -> list[str]:
    """Текст уведомления о заказе — общий для Telegram и письма владельцу."""
    lines = []
    for item in order.items.all():
        lines.append(f"• {item.product_name} × {item.quantity} = {item.line_total:.0f} ₽")
        if item.custom_config:
            cfg = item.custom_config
            tassel = "да" if cfg.get("tassel") else "нет"
            lines.append(
                f"   (размер: {cfg.get('size')}, цвет: {cfg.get('bag_color')}, "
                f"молния: {cfg.get('zipper_color')}, кисточка: {tassel})"
            )
    if order.delivery_method:
        place = order.delivery_pvz_address or order.delivery_address
        lines += [
            "",
            f"Доставка: {order.get_delivery_method_display()} — {order.delivery_cost:.0f} ₽",
            f"Куда: {order.delivery_city}{', ' + place if place else ''}"
            + (f" (индекс {order.delivery_postcode})" if order.delivery_postcode else ""),
        ]
    lines += [
        "",
        f"Итого: {order.total:.0f} ₽",
        "",
        f"Клиент: {order.customer_name}",
        f"Телефон: {order.customer_phone}",
        f"Email: {order.customer_email}",
    ]
    if order.comment:
        lines.append(f"Комментарий: {order.comment}")
    return lines


def notify_new_order(order) -> bool:
    lines = [f"🛍 Новый заказ #{order.pk}", ""] + _order_summary(order)
    return send_telegram_message("\n".join(lines))


def notify_owner_email(order) -> bool:
    """Дубль уведомления о заказе на почту владельца: Telegram из РФ ненадёжен."""
    if not settings.ORDER_NOTIFY_EMAIL:
        return False
    try:
        send_mail(
            subject=f"Новый заказ #{order.pk} — {order.total:.0f} ₽",
            message="\n".join(_order_summary(order)),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.ORDER_NOTIFY_EMAIL],
        )
        return True
    except Exception:
        logger.exception("Не удалось отправить владельцу письмо о заказе #%s", order.pk)
        return False
