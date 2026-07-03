"""Order notifications. Telegram token lives in .env — NEVER on the client."""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


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


def notify_new_order(order) -> bool:
    lines = [f"🛍 Новый заказ #{order.pk}", ""]
    for item in order.items.all():
        lines.append(f"• {item.product_name} × {item.quantity} = {item.line_total:.0f} ₽")
        if item.custom_config:
            cfg = item.custom_config
            tassel = "да" if cfg.get("tassel") else "нет"
            lines.append(
                f"   (размер: {cfg.get('size')}, цвет: {cfg.get('bag_color')}, "
                f"молния: {cfg.get('zipper_color')}, кисточка: {tassel})"
            )
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
    return send_telegram_message("\n".join(lines))
