"""
Order creation: the single place where an order comes to life.

Guarantees:
- prices are re-read from the DB / pricing rules, client prices are ignored;
- stock is checked and decremented under row locks (select_for_update),
  the whole order is atomic — no partial writes on failure;
- Telegram notification fires AFTER the transaction commits and never
  fails the order.
"""

from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import ProductVariant
from apps.delivery import quotes as delivery_quotes

from . import pricing
from .models import Order, OrderItem
from .notifications import notify_new_order, send_order_email


def _resolve_delivery(delivery: dict, items: list[dict]) -> dict:
    """Серверная цена доставки; клиентские цифры игнорируются."""
    weight = delivery_quotes.cart_weight_grams(items)
    cost = delivery_quotes.price_for_method(
        delivery["method"],
        delivery.get("city_code"),
        delivery.get("postcode") or None,
        weight,
    )
    if cost is None:
        raise serializers.ValidationError(
            {"delivery": "Не удалось рассчитать доставку. Обновите страницу и попробуйте снова."}
        )
    return {"cost": cost}


def create_order(*, customer: dict, items: list[dict], delivery: dict, user=None) -> Order:
    resolved_delivery = _resolve_delivery(delivery, items)

    with transaction.atomic():
        order = Order.objects.create(
            user=user if (user and user.is_authenticated) else None,
            customer_name=customer["name"],
            customer_phone=customer["phone"],
            customer_email=customer["email"],
            comment=customer.get("comment", ""),
            delivery_method=delivery["method"],
            delivery_cost=resolved_delivery["cost"],
            delivery_city=delivery.get("city_name", ""),
            delivery_postcode=delivery.get("postcode", "") or "",
            delivery_address=delivery.get("address", ""),
            delivery_pvz_code=delivery.get("pvz_code", ""),
            delivery_pvz_address=delivery.get("pvz_address", ""),
        )

        # Блокируем задействованные варианты одним запросом (сортировка по id —
        # защита от взаимных блокировок при конкурентных заказах).
        variant_ids = [item["variant_id"] for item in items if "variant_id" in item]
        locked_variants = {
            v.pk: v
            for v in ProductVariant.objects.select_for_update()
            .filter(pk__in=variant_ids)
            .order_by("pk")
            .select_related("product")
        }

        total = Decimal("0")
        errors = []
        order_items = []

        for index, item in enumerate(items):
            quantity = item["quantity"]

            if "variant_id" in item:
                variant = locked_variants.get(item["variant_id"])
                if variant is None or not variant.is_active or not variant.product.is_active:
                    errors.append({"index": index, "detail": "Товар недоступен."})
                    continue
                if variant.stock < quantity:
                    errors.append(
                        {
                            "index": index,
                            "detail": f"Недостаточно на складе «{variant.product.name}»: "
                            f"осталось {variant.stock} шт.",
                        }
                    )
                    continue
                variant.stock -= quantity
                order_items.append(
                    OrderItem(
                        order=order,
                        variant=variant,
                        product_name=variant.product.name,
                        sku=variant.sku,
                        price=variant.price,  # цена из БД, не от клиента
                        quantity=quantity,
                    )
                )
                total += variant.price * quantity
            else:
                config = item["custom"]
                price = pricing.compute_custom_price(config)
                order_items.append(
                    OrderItem(
                        order=order,
                        product_name=pricing.custom_display_name(config),
                        price=price,
                        quantity=quantity,
                        custom_config=config,
                    )
                )
                total += price * quantity

        if errors:
            # откатывает транзакцию целиком: ни заказа, ни списаний
            raise serializers.ValidationError({"items": errors})

        ProductVariant.objects.bulk_update([v for v in locked_variants.values()], ["stock"])
        OrderItem.objects.bulk_create(order_items)
        order.total = total + order.delivery_cost
        order.save(update_fields=["total"])

    # после успешного коммита; сбой уведомлений заказ не валит
    notify_new_order(order)
    send_order_email(order)
    return order
