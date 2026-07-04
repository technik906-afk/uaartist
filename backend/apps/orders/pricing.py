"""
Server-side pricing for constructor (custom) items.

Источник истины — БД (catalog.ConstructorOption, правится через админку).
Клиент цену НЕ передаёт: она всегда вычисляется здесь.
"""

from decimal import Decimal

from rest_framework import serializers

from apps.catalog.models import ConstructorOption

OptionType = ConstructorOption.OptionType

TASSEL_SLUG = "tassel"


def _resolve(option_type: str, slug: str, field: str) -> ConstructorOption:
    option = ConstructorOption.objects.filter(
        option_type=option_type, slug=slug, is_active=True
    ).first()
    if option is None:
        raise serializers.ValidationError({field: f"Недоступная опция: {slug}"})
    return option


def resolve_config(config: dict) -> dict[str, ConstructorOption | None]:
    """Разворачивает слаги конфига в опции из БД; кидает 400 на неизвестные/выключенные."""
    resolved = {
        "size": _resolve(OptionType.SIZE, config["size"], "size"),
        "bag_color": _resolve(OptionType.BAG_COLOR, config["bag_color"], "bag_color"),
        "zipper_color": _resolve(OptionType.ZIPPER_COLOR, config["zipper_color"], "zipper_color"),
        "tassel": None,
    }
    if config.get("tassel"):
        resolved["tassel"] = _resolve(OptionType.ADDON, TASSEL_SLUG, "tassel")
    return resolved


def compute_custom_price(config: dict) -> Decimal:
    """Цена кастомного изделия: размер + наценки цветов + дополнения."""
    resolved = resolve_config(config)
    price = resolved["size"].price + resolved["bag_color"].price + resolved["zipper_color"].price
    if resolved["tassel"] is not None:
        price += resolved["tassel"].price
    return price


def custom_display_name(config: dict) -> str:
    resolved = resolve_config(config)
    return (
        f"Косметичка «{resolved['size'].name}» "
        f"({resolved['bag_color'].name}, индивидуальный пошив)"
    )
