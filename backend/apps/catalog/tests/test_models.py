"""Catalog model invariants: constraints, relations, DoD scenario."""

from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError

from apps.catalog.models import (
    Attribute,
    AttributeValue,
    Category,
    Product,
    ProductImage,
    ProductVariant,
)

# 1x1 transparent GIF — enough for ImageField validation in tests.
TINY_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!"
    b"\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00"
    b"\x02\x02D\x01\x00;"
)


def make_image(name="test.gif"):
    return SimpleUploadedFile(name, TINY_GIF, content_type="image/gif")


@pytest.fixture
def category(db):
    return Category.objects.create(name="Косметички", slug="kosmetichki")


@pytest.fixture
def product(category):
    return Product.objects.create(
        category=category,
        name="Льняная косметичка «Беж»",
        slug="lnyanaya-kosmetichka-bezh",
    )


class TestCategory:
    def test_str(self, category):
        assert str(category) == "Косметички"

    def test_nesting(self, category):
        child = Category.objects.create(name="Дорожные", slug="dorozhnye", parent=category)
        assert child.parent == category
        assert list(category.children.all()) == [child]

    def test_slug_unique(self, category, db):
        with pytest.raises(IntegrityError):
            Category.objects.create(name="Другая", slug="kosmetichki")


class TestProductImage:
    def test_only_one_main_image_per_product(self, product):
        ProductImage.objects.create(product=product, image=make_image(), is_main=True)
        with pytest.raises(IntegrityError):
            ProductImage.objects.create(product=product, image=make_image(), is_main=True)

    def test_many_non_main_images_allowed(self, product):
        ProductImage.objects.create(product=product, image=make_image(), is_main=True)
        ProductImage.objects.create(product=product, image=make_image())
        ProductImage.objects.create(product=product, image=make_image())
        assert product.images.count() == 3

    def test_ordering_by_sort_order(self, product):
        img2 = ProductImage.objects.create(product=product, image=make_image(), sort_order=2)
        img1 = ProductImage.objects.create(product=product, image=make_image(), sort_order=1)
        assert list(product.images.all()) == [img1, img2]


class TestProductVariant:
    def test_price_cannot_be_negative(self, product):
        with pytest.raises(IntegrityError):
            ProductVariant.objects.create(product=product, sku="BAD-1", price=Decimal("-1"))

    def test_sku_unique(self, product):
        ProductVariant.objects.create(product=product, sku="BEZH-S", price=Decimal("2490"))
        with pytest.raises(IntegrityError):
            ProductVariant.objects.create(product=product, sku="BEZH-S", price=Decimal("100"))

    def test_in_stock(self, product):
        variant = ProductVariant.objects.create(
            product=product, sku="BEZH-M", price=Decimal("2490"), stock=0
        )
        assert not variant.in_stock
        variant.stock = 3
        assert variant.in_stock


class TestAttributeValue:
    def test_value_slug_unique_within_attribute(self, db):
        size = Attribute.objects.create(name="Размер", slug="razmer")
        AttributeValue.objects.create(attribute=size, value="Мини", slug="mini")
        with pytest.raises(IntegrityError):
            AttributeValue.objects.create(attribute=size, value="Мини-2", slug="mini")

    def test_same_slug_ok_for_different_attributes(self, db):
        size = Attribute.objects.create(name="Размер", slug="razmer")
        color = Attribute.objects.create(name="Цвет", slug="tsvet")
        AttributeValue.objects.create(attribute=size, value="Мини", slug="mini")
        AttributeValue.objects.create(attribute=color, value="Мини", slug="mini")  # ок


class TestDodScenario:
    """DoD Этапа 1: товар с фото, вариантами, ценами и остатками."""

    def test_full_product_setup(self, category):
        size = Attribute.objects.create(name="Размер", slug="razmer")
        mini = AttributeValue.objects.create(attribute=size, value="Мини", slug="mini")
        maxi = AttributeValue.objects.create(attribute=size, value="Макси", slug="maxi")
        color = Attribute.objects.create(name="Цвет", slug="tsvet")
        bezh = AttributeValue.objects.create(
            attribute=color, value="Беж", slug="bezh", color_hex="#E8E4D9"
        )

        product = Product.objects.create(
            category=category,
            name="Косметичка «Шалфей»",
            slug="kosmetichka-shalfey",
            meta_title="Купить косметичку Шалфей",
        )
        ProductImage.objects.create(product=product, image=make_image(), is_main=True)
        ProductImage.objects.create(product=product, image=make_image(), sort_order=1)

        v1 = ProductVariant.objects.create(
            product=product, sku="SHALF-MINI-BEZH", price=Decimal("2490.00"), stock=5
        )
        v1.attribute_values.set([mini, bezh])
        v2 = ProductVariant.objects.create(
            product=product, sku="SHALF-MAXI-BEZH", price=Decimal("3290.00"), stock=2
        )
        v2.attribute_values.set([maxi, bezh])

        assert product.images.count() == 2
        assert product.variants.count() == 2
        assert v1.attribute_values.count() == 2
        prices = {v.sku: v.price for v in product.variants.all()}
        assert prices["SHALF-MINI-BEZH"] == Decimal("2490.00")
        assert prices["SHALF-MAXI-BEZH"] == Decimal("3290.00")
