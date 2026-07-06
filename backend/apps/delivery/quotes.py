"""
Котировки доставки: единая точка расчёта для чекаута и пересчёта заказа.

Метод → цена считается ТОЛЬКО здесь (клиентские цифры — украшение витрины).
"""

from decimal import Decimal

from apps.catalog.models import ProductVariant

from .services import cdek, pochta

# Вес кастомной позиции конструктора (г) — пока фикс, позже можно по размеру
CUSTOM_ITEM_WEIGHT = 300
DEFAULT_ITEM_WEIGHT = 300

METHODS = {
    "cdek_pvz": "СДЭК — пункт выдачи",
    "cdek_courier": "СДЭК — курьер до двери",
    "post": "Почта России",
}


def cart_weight_grams(items: list[dict]) -> int:
    """Суммарный вес позиций чекаута (variant_id/custom + quantity)."""
    variant_ids = [i["variant_id"] for i in items if "variant_id" in i]
    weights = dict(
        ProductVariant.objects.filter(pk__in=variant_ids).values_list("pk", "weight_grams")
    )
    total = 0
    for item in items:
        quantity = item.get("quantity", 1)
        if "variant_id" in item:
            total += (weights.get(item["variant_id"]) or DEFAULT_ITEM_WEIGHT) * quantity
        else:
            total += CUSTOM_ITEM_WEIGHT * quantity
    return max(total, 100)


def quote_all(city_code: int | None, postcode: str | None, weight_grams: int) -> list[dict]:
    """Все доступные способы с ценами. Недоступные перевозчики просто выпадают."""
    quotes = []

    if city_code:
        try:
            tariffs = cdek.calc_tariffs(city_code, weight_grams)
        except cdek.CdekUnavailable:
            tariffs = {}
        if cdek.TARIFF_PVZ in tariffs:
            t = tariffs[cdek.TARIFF_PVZ]
            quotes.append(
                {
                    "method": "cdek_pvz",
                    "name": METHODS["cdek_pvz"],
                    "price": t["price"],
                    "days": f"{t['period_min']}–{t['period_max']}",
                }
            )
        if cdek.TARIFF_COURIER in tariffs:
            t = tariffs[cdek.TARIFF_COURIER]
            quotes.append(
                {
                    "method": "cdek_courier",
                    "name": METHODS["cdek_courier"],
                    "price": t["price"],
                    "days": f"{t['period_min']}–{t['period_max']}",
                }
            )

    if postcode:
        try:
            tariff = pochta.calc_tariff(postcode, weight_grams)
        except pochta.PochtaUnavailable:
            tariff = None
        if tariff:
            quotes.append(
                {
                    "method": "post",
                    "name": METHODS["post"],
                    "price": tariff["price"],
                    "days": "4–10",
                }
            )

    return quotes


def price_for_method(
    method: str, city_code: int | None, postcode: str | None, weight_grams: int
) -> Decimal | None:
    """Серверная цена выбранного способа (для создания заказа)."""
    for quote in quote_all(city_code, postcode, weight_grams):
        if quote["method"] == method:
            return Decimal(str(quote["price"]))
    return None
