"""Catalog API: list/detail shapes, filters, search, schema."""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.catalog.models import Attribute, AttributeValue, Category, Product, ProductVariant

from .test_models import (
    TINY_GIF,  # noqa: F401
    make_image,  # noqa: F401  (reuse tiny gif helper)
)


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def catalog(db):
    """Two categories, three products (one inactive), variants with prices/stock."""
    bags = Category.objects.create(name="Косметички", slug="kosmetichki")
    totes = Category.objects.create(name="Сумки", slug="sumki")

    size = Attribute.objects.create(name="Размер", slug="razmer")
    mini = AttributeValue.objects.create(attribute=size, value="Мини", slug="mini")

    bezh = Product.objects.create(category=bags, name="Косметичка «Беж»", slug="bezh")
    v = ProductVariant.objects.create(product=bezh, sku="BEZH-1", price=Decimal("2490"), stock=5)
    v.attribute_values.add(mini)

    boho = Product.objects.create(category=bags, name="Косметичка «Бохо»", slug="boho")
    ProductVariant.objects.create(product=boho, sku="BOHO-1", price=Decimal("3690"), stock=0)

    tote = Product.objects.create(category=totes, name="Сумка-шоппер", slug="shopper")
    ProductVariant.objects.create(product=tote, sku="TOTE-1", price=Decimal("4500"), stock=2)

    hidden = Product.objects.create(
        category=bags, name="Скрытый товар", slug="hidden", is_active=False
    )
    ProductVariant.objects.create(product=hidden, sku="HID-1", price=Decimal("100"), stock=1)

    return {"bags": bags, "totes": totes, "bezh": bezh, "boho": boho, "tote": tote}


class TestProductList:
    def test_only_active_products(self, api, catalog):
        data = api.get("/api/v1/products/").json()
        slugs = [p["slug"] for p in data["results"]]
        assert "hidden" not in slugs
        assert data["count"] == 3

    def test_list_shape(self, api, catalog):
        data = api.get("/api/v1/products/").json()
        item = next(p for p in data["results"] if p["slug"] == "bezh")
        assert item["category"] == "kosmetichki"
        assert Decimal(item["price_min"]) == Decimal("2490")
        assert item["in_stock"] is True

    def test_filter_by_category(self, api, catalog):
        data = api.get("/api/v1/products/", {"category": "sumki"}).json()
        assert [p["slug"] for p in data["results"]] == ["shopper"]

    def test_filter_by_price(self, api, catalog):
        data = api.get("/api/v1/products/", {"min_price": 3000, "max_price": 4000}).json()
        assert [p["slug"] for p in data["results"]] == ["boho"]

    def test_filter_in_stock(self, api, catalog):
        data = api.get("/api/v1/products/", {"in_stock": "true"}).json()
        slugs = {p["slug"] for p in data["results"]}
        assert slugs == {"bezh", "shopper"}  # boho: stock=0

    def test_search(self, api, catalog):
        data = api.get("/api/v1/products/", {"search": "Бохо"}).json()
        assert [p["slug"] for p in data["results"]] == ["boho"]

    def test_ordering_by_price(self, api, catalog):
        data = api.get("/api/v1/products/", {"ordering": "price_min"}).json()
        prices = [Decimal(p["price_min"]) for p in data["results"]]
        assert prices == sorted(prices)


class TestProductDetail:
    def test_detail_shape(self, api, catalog):
        data = api.get("/api/v1/products/bezh/").json()
        assert data["slug"] == "bezh"
        assert len(data["variants"]) == 1
        variant = data["variants"][0]
        assert variant["sku"] == "BEZH-1"
        assert variant["in_stock"] is True
        assert variant["attribute_values"][0]["attribute_slug"] == "razmer"
        assert "meta_title" in data

    def test_inactive_product_404(self, api, catalog):
        assert api.get("/api/v1/products/hidden/").status_code == 404


class TestCategories:
    def test_list_without_pagination(self, api, catalog):
        data = api.get("/api/v1/categories/").json()
        assert isinstance(data, list)
        assert {c["slug"] for c in data} == {"kosmetichki", "sumki"}

    def test_retrieve_by_slug(self, api, catalog):
        assert api.get("/api/v1/categories/sumki/").json()["name"] == "Сумки"


class TestSchema:
    def test_openapi_schema_available(self, api, db):
        response = api.get("/api/v1/schema/")
        assert response.status_code == 200

    def test_swagger_ui_available(self, api, db):
        assert api.get("/api/v1/docs/").status_code == 200
