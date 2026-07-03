"""
Catalog data model.

Conventions:
- A cosmetic bag is just a product in a category — nothing category-specific
  is hardcoded, the shop is multi-category from day one.
- Price and stock live on ProductVariant, not on Product. Every product has
  at least one variant (a simple product = one variant with no attribute
  values). The cart/order layer always references variants, which keeps its
  logic uniform.
- Custom constructor items are NOT variants: the order layer (Этап 3) stores
  their configuration as JSON on the order item instead.
"""

from django.db import models


class Category(models.Model):
    """Product category, optionally nested (parent → children)."""

    name = models.CharField("Название", max_length=120)
    slug = models.SlugField("Слаг", max_length=140, unique=True)
    parent = models.ForeignKey(
        "self",
        verbose_name="Родительская категория",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="children",
    )
    description = models.TextField("Описание", blank=True)
    is_active = models.BooleanField("Активна", default=True)

    # SEO
    meta_title = models.CharField("Meta title", max_length=200, blank=True)
    meta_description = models.CharField("Meta description", max_length=300, blank=True)

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    """A sellable item. Price/stock live on its variants."""

    category = models.ForeignKey(
        Category,
        verbose_name="Категория",
        on_delete=models.PROTECT,
        related_name="products",
    )
    name = models.CharField("Название", max_length=200)
    slug = models.SlugField("Слаг", max_length=220, unique=True)
    description = models.TextField("Описание", blank=True)
    is_active = models.BooleanField("Активен", default=True)

    # SEO
    meta_title = models.CharField("Meta title", max_length=200, blank=True)
    meta_description = models.CharField("Meta description", max_length=300, blank=True)

    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """Product photo; exactly one per product may be marked as main."""

    product = models.ForeignKey(
        Product,
        verbose_name="Товар",
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField("Изображение", upload_to="products/%Y/%m/")
    alt_text = models.CharField("Alt-текст", max_length=200, blank=True)
    sort_order = models.PositiveSmallIntegerField("Порядок", default=0)
    is_main = models.BooleanField("Главное", default=False)

    class Meta:
        verbose_name = "Изображение товара"
        verbose_name_plural = "Изображения товаров"
        ordering = ["sort_order", "id"]
        constraints = [
            # Partial unique index: at most one main image per product.
            models.UniqueConstraint(
                fields=["product"],
                condition=models.Q(is_main=True),
                name="unique_main_image_per_product",
            ),
        ]

    def __str__(self):
        return f"{self.product} — фото #{self.pk}"


class Attribute(models.Model):
    """Variant attribute kind, e.g. «Размер», «Цвет»."""

    name = models.CharField("Название", max_length=100, unique=True)
    slug = models.SlugField("Слаг", max_length=120, unique=True)

    class Meta:
        verbose_name = "Атрибут"
        verbose_name_plural = "Атрибуты"
        ordering = ["name"]

    def __str__(self):
        return self.name


class AttributeValue(models.Model):
    """Concrete attribute value, e.g. Размер=Мини, Цвет=Беж (#E8E4D9)."""

    attribute = models.ForeignKey(
        Attribute,
        verbose_name="Атрибут",
        on_delete=models.CASCADE,
        related_name="values",
    )
    value = models.CharField("Значение", max_length=100)
    slug = models.SlugField("Слаг", max_length=120)
    # Optional color swatch for UI (catalog filters, constructor preview).
    color_hex = models.CharField("Цвет (hex)", max_length=7, blank=True)

    class Meta:
        verbose_name = "Значение атрибута"
        verbose_name_plural = "Значения атрибутов"
        ordering = ["attribute", "value"]
        constraints = [
            models.UniqueConstraint(
                fields=["attribute", "slug"],
                name="unique_value_slug_per_attribute",
            ),
        ]

    def __str__(self):
        return f"{self.attribute}: {self.value}"


class ProductVariant(models.Model):
    """
    Purchasable unit: a concrete combination of attribute values
    with its own SKU, price and stock. This is what goes into the cart.
    """

    product = models.ForeignKey(
        Product,
        verbose_name="Товар",
        on_delete=models.CASCADE,
        related_name="variants",
    )
    sku = models.CharField("Артикул (SKU)", max_length=64, unique=True)
    price = models.DecimalField("Цена, ₽", max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField("Остаток", default=0)
    is_active = models.BooleanField("Активен", default=True)
    attribute_values = models.ManyToManyField(
        AttributeValue,
        verbose_name="Значения атрибутов",
        blank=True,
        related_name="variants",
    )

    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        verbose_name = "Вариант товара"
        verbose_name_plural = "Варианты товаров"
        ordering = ["product", "sku"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(price__gte=0),
                name="variant_price_gte_0",
            ),
        ]

    def __str__(self):
        return f"{self.product} [{self.sku}]"

    @property
    def in_stock(self) -> bool:
        return self.stock > 0
