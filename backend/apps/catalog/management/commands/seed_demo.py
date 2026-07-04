"""
Seed demo catalog data from the legacy static site (6 products).

Idempotent: safe to run repeatedly (get_or_create by slug/sku).
Images are read from --images-dir (docker-compose mounts legacy/static-site/img
to /seed-img); products are created without photos if the dir is missing.
"""

from decimal import Decimal
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand

from apps.catalog.models import Category, Product, ProductImage, ProductVariant

# name, slug, description, price, gallery (первое фото — главное)
DEMO_PRODUCTS = [
    (
        "Льняная косметичка «Беж»",
        "lnyanaya-kosmetichka-bezh",
        "Классическая бежевая с кисточкой",
        "2490",
        ["IMG_6666.jpg", "IMG_6677.jpg", "IMG_6674.jpg"],
    ),
    (
        "Косметичка «Шалфей»",
        "kosmetichka-shalfey",
        "Нежный шалфейный оттенок",
        "2890",
        ["IMG_6669.jpg", "IMG_6670.jpg", "IMG_6666.jpg"],
    ),
    (
        "Косметичка «Эко»",
        "kosmetichka-eko",
        "Натуральный льняной цвет",
        "2690",
        ["IMG_6670.jpg", "IMG_6669.jpg", "IMG_6677.jpg"],
    ),
    (
        "Косметичка «Минимал»",
        "kosmetichka-minimal",
        "Лаконичный дизайн без декора",
        "2590",
        ["IMG_6672.jpg", "IMG_6666.jpg", "IMG_6670.jpg"],
    ),
    (
        "Дорожный набор",
        "dorozhnyj-nabor",
        "Набор из трёх косметичек",
        "3990",
        ["IMG_6674.jpg", "IMG_6676.jpg", "IMG_6672.jpg"],
    ),
    (
        "Косметичка «Бохо»",
        "kosmetichka-boho",
        "С этническим узором",
        "3690",
        ["IMG_6676.jpg", "IMG_6674.jpg", "IMG_6669.jpg"],
    ),
]


class Command(BaseCommand):
    help = "Заполняет каталог демо-товарами с legacy-сайта"

    def add_arguments(self, parser):
        parser.add_argument("--images-dir", default="/seed-img")

    def handle(self, *args, **options):
        images_dir = Path(options["images_dir"])
        category, _ = Category.objects.get_or_create(
            slug="kosmetichki", defaults={"name": "Косметички"}
        )

        created = 0
        for name, slug, description, price, gallery in DEMO_PRODUCTS:
            product, was_created = Product.objects.get_or_create(
                slug=slug,
                defaults={"category": category, "name": name, "description": description},
            )
            ProductVariant.objects.get_or_create(
                sku=f"DEMO-{slug.upper()[:24]}",
                defaults={"product": product, "price": Decimal(price), "stock": 5},
            )

            # Догоняем галерею до нужного размера (идемпотентно: только недостающие).
            existing = product.images.count()
            for sort_order, image_name in enumerate(gallery[existing:], start=existing):
                image_path = images_dir / image_name
                if not image_path.is_file():
                    self.stdout.write(self.style.WARNING(f"  нет файла {image_path} — пропуск"))
                    continue
                with image_path.open("rb") as f:
                    ProductImage.objects.create(
                        product=product,
                        image=File(f, name=image_name),
                        alt_text=name,
                        sort_order=sort_order,
                        is_main=(sort_order == 0),
                    )

            created += int(was_created)

        self.stdout.write(
            self.style.SUCCESS(f"Готово: {created} новых товаров (всего {Product.objects.count()})")
        )
