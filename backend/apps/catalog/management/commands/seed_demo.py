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

# name, slug, description, price, image filename (from the legacy site)
DEMO_PRODUCTS = [
    (
        "Льняная косметичка «Беж»",
        "lnyanaya-kosmetichka-bezh",
        "Классическая бежевая с кисточкой",
        "2490",
        "IMG_6666.jpg",
    ),
    (
        "Косметичка «Шалфей»",
        "kosmetichka-shalfey",
        "Нежный шалфейный оттенок",
        "2890",
        "IMG_6669.jpg",
    ),
    ("Косметичка «Эко»", "kosmetichka-eko", "Натуральный льняной цвет", "2690", "IMG_6670.jpg"),
    (
        "Косметичка «Минимал»",
        "kosmetichka-minimal",
        "Лаконичный дизайн без декора",
        "2590",
        "IMG_6672.jpg",
    ),
    ("Дорожный набор", "dorozhnyj-nabor", "Набор из трёх косметичек", "3990", "IMG_6674.jpg"),
    ("Косметичка «Бохо»", "kosmetichka-boho", "С этническим узором", "3690", "IMG_6676.jpg"),
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
        for name, slug, description, price, image_name in DEMO_PRODUCTS:
            product, was_created = Product.objects.get_or_create(
                slug=slug,
                defaults={"category": category, "name": name, "description": description},
            )
            ProductVariant.objects.get_or_create(
                sku=f"DEMO-{slug.upper()[:24]}",
                defaults={"product": product, "price": Decimal(price), "stock": 5},
            )

            image_path = images_dir / image_name
            if was_created and image_path.is_file():
                with image_path.open("rb") as f:
                    ProductImage.objects.create(
                        product=product,
                        image=File(f, name=image_name),
                        alt_text=name,
                        is_main=True,
                    )
            elif was_created:
                self.stdout.write(self.style.WARNING(f"  нет файла {image_path}, товар без фото"))

            created += int(was_created)

        self.stdout.write(
            self.style.SUCCESS(f"Готово: {created} новых товаров (всего {Product.objects.count()})")
        )
