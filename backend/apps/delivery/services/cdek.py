"""
Клиент API СДЭК v2 (api.cdek.ru).

- OAuth-токен кэшируется в Django cache (живёт ~час, храним чуть меньше).
- Все функции fail-soft: сетевые ошибки → None/[], решает вызывающий слой.
- Тарифы: 136 «Посылка склад-склад» (ПВЗ), 137 «Посылка склад-дверь» (курьер).
"""

import logging

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

BASE = "https://api.cdek.ru/v2"
TOKEN_CACHE_KEY = "cdek_oauth_token"
TARIFF_PVZ = 136
TARIFF_COURIER = 137
# Габариты типовой коробки, см (для расчёта объёмного веса)
DEFAULT_DIMENSIONS = {"length": 20, "width": 15, "height": 8}


class CdekUnavailable(Exception):
    """СДЭК недоступен или не настроен."""


def _token() -> str:
    token = cache.get(TOKEN_CACHE_KEY)
    if token:
        return token
    if not settings.CDEK_ACCOUNT or not settings.CDEK_SECURE_PASSWORD:
        raise CdekUnavailable("CDEK credentials are not configured")
    try:
        response = requests.post(
            f"{BASE}/oauth/token",
            params={
                "grant_type": "client_credentials",
                "client_id": settings.CDEK_ACCOUNT,
                "client_secret": settings.CDEK_SECURE_PASSWORD,
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        logger.warning("СДЭК OAuth недоступен: %s", exc)
        raise CdekUnavailable(str(exc)) from exc
    token = data["access_token"]
    cache.set(TOKEN_CACHE_KEY, token, data.get("expires_in", 3600) - 60)
    return token


def _get(path: str, params: dict) -> list | dict:
    response = requests.get(
        f"{BASE}{path}",
        params=params,
        headers={"Authorization": f"Bearer {_token()}"},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def suggest_cities(query: str) -> list[dict]:
    """Подсказки городов: [{code, full_name}]."""
    try:
        data = _get("/location/suggest/cities", {"name": query, "country_code": "RU"})
        return [{"code": c["code"], "full_name": c["full_name"]} for c in data[:8]]
    except (requests.RequestException, CdekUnavailable, KeyError) as exc:
        logger.warning("СДЭК suggest_cities: %s", exc)
        return []


def delivery_points(city_code: int) -> list[dict]:
    """Пункты выдачи города: [{code, name, address, work_time}]."""
    try:
        data = _get("/deliverypoints", {"city_code": city_code, "type": "PVZ"})
        return [
            {
                "code": p["code"],
                "name": p.get("name", ""),
                "address": p.get("location", {}).get("address_full", ""),
                "work_time": p.get("work_time", ""),
            }
            for p in data
        ]
    except (requests.RequestException, CdekUnavailable, KeyError) as exc:
        logger.warning("СДЭК delivery_points: %s", exc)
        return []


def calc_tariffs(to_city_code: int, weight_grams: int) -> dict[int, dict]:
    """
    Тарифы до города: {tariff_code: {price, period_min, period_max}}.
    Кэшируется на час — и для скорости, и как фолбэк при пересчёте заказа.
    """
    cache_key = f"cdek_tariff_{to_city_code}_{weight_grams}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = requests.post(
            f"{BASE}/calculator/tarifflist",
            json={
                "from_location": {"code": settings.CDEK_FROM_CITY_CODE},
                "to_location": {"code": to_city_code},
                "packages": [{"weight": max(weight_grams, 100), **DEFAULT_DIMENSIONS}],
            },
            headers={"Authorization": f"Bearer {_token()}"},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, CdekUnavailable) as exc:
        logger.warning("СДЭК calc_tariffs: %s", exc)
        raise CdekUnavailable(str(exc)) from exc

    result = {
        t["tariff_code"]: {
            "price": t["delivery_sum"],
            "period_min": t["period_min"],
            "period_max": t["period_max"],
        }
        for t in data.get("tariff_codes", [])
        if t["tariff_code"] in (TARIFF_PVZ, TARIFF_COURIER)
    }
    cache.set(cache_key, result, 3600)
    return result
