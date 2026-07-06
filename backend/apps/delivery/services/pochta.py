"""
Тарификатор Почты России (tariff.pochta.ru) — открытый, без договора.
Объект 23030 = «Посылка онлайн» (тариф для интернет-магазинов).
"""

import logging

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

TARIFF_URL = "https://tariff.pochta.ru/v2/calculate/tariff"
OBJECT_ONLINE_PARCEL = 23030


class PochtaUnavailable(Exception):
    pass


def calc_tariff(to_postcode: str, weight_grams: int) -> dict | None:
    """Стоимость «Посылки онлайн»: {price} или исключение при недоступности."""
    cache_key = f"pochta_tariff_{to_postcode}_{weight_grams}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            TARIFF_URL,
            params={
                "json": "",
                "object": OBJECT_ONLINE_PARCEL,
                "from": settings.POCHTA_FROM_POSTCODE,
                "to": to_postcode,
                "weight": max(weight_grams, 100),
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Почта тарификатор: %s", exc)
        raise PochtaUnavailable(str(exc)) from exc

    if "paynds" not in data:
        logger.warning("Почта: нет тарифа для %s: %s", to_postcode, data.get("errors"))
        return None

    result = {"price": round(data["paynds"] / 100)}
    cache.set(cache_key, result, 3600)
    return result
