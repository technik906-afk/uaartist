"""
Server-side pricing for constructor (custom) items.

Prices/options mirror the legacy constructor (legacy/static-site/constructor.*).
The client NEVER sends a price — it is always computed here.
"""

from decimal import Decimal

SIZES = {
    "small": {"name": "Мини", "price": Decimal("2490")},
    "medium": {"name": "Стандарт", "price": Decimal("2890")},
    "large": {"name": "Макси", "price": Decimal("3490")},
}

BAG_COLORS = {
    "beige": "Бежевый",
    "sage": "Шалфей",
    "olive": "Олива",
    "gray": "Серый",
    "natural": "Натуральный",
    "white": "Белый",
}

ZIPPER_COLORS = {
    "gold": "Золотая",
    "silver": "Серебряная",
    "bronze": "Бронзовая",
    "black": "Чёрная",
    "beige": "Бежевая",
}

TASSEL_PRICE = Decimal("200")


def compute_custom_price(config: dict) -> Decimal:
    """Цена кастомной косметички: размер + опциональная кисточка."""
    price = SIZES[config["size"]]["price"]
    if config.get("tassel"):
        price += TASSEL_PRICE
    return price


def custom_display_name(config: dict) -> str:
    size = SIZES[config["size"]]["name"]
    color = BAG_COLORS[config["bag_color"]]
    return f"Косметичка «{size}» ({color}, индивидуальный пошив)"
