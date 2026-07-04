"""Сид опций конструктора — значения из legacy-конструктора (бывший pricing.py)."""

from django.db import migrations

OPTIONS = [
    # (option_type, slug, name, price, color_hex, sort_order)
    ("size", "small", "Мини", "2490", "", 0),
    ("size", "medium", "Стандарт", "2890", "", 1),
    ("size", "large", "Макси", "3490", "", 2),
    ("bag_color", "beige", "Бежевый", "0", "#E8E4D9", 0),
    ("bag_color", "sage", "Шалфей", "0", "#9CAF88", 1),
    ("bag_color", "olive", "Олива", "0", "#8B9A6B", 2),
    ("bag_color", "gray", "Серый", "0", "#B8B8B8", 3),
    ("bag_color", "natural", "Натуральный", "0", "#D4C4B0", 4),
    ("bag_color", "white", "Белый", "0", "#F5F3F0", 5),
    ("zipper_color", "gold", "Золотая", "0", "#D4AF37", 0),
    ("zipper_color", "silver", "Серебряная", "0", "#C0C0C0", 1),
    ("zipper_color", "bronze", "Бронзовая", "0", "#CD7F32", 2),
    ("zipper_color", "black", "Чёрная", "0", "#2C2C2C", 3),
    ("zipper_color", "beige", "Бежевая", "0", "#C4B5A0", 4),
    ("addon", "tassel", "Кисточка", "200", "", 0),
]


def seed(apps, schema_editor):
    ConstructorOption = apps.get_model("catalog", "ConstructorOption")
    for option_type, slug, name, price, color_hex, sort_order in OPTIONS:
        ConstructorOption.objects.get_or_create(
            option_type=option_type,
            slug=slug,
            defaults={
                "name": name,
                "price": price,
                "color_hex": color_hex,
                "sort_order": sort_order,
            },
        )


def unseed(apps, schema_editor):
    ConstructorOption = apps.get_model("catalog", "ConstructorOption")
    ConstructorOption.objects.filter(slug__in=[slug for _, slug, *_ in OPTIONS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0002_constructoroption"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
