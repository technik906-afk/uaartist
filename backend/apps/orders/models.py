"""
Orders.

Key invariants (see roadmap Этап 3):
- Prices are FROZEN on the order item at purchase time — never read back
  from the catalog. Totals are computed server-side only.
- payment_status is a separate field from order status: the payment
  provider (Этап 5) plugs in without remodelling.
- Order.user is nullable — guest checkout is first-class.
- An item references EITHER a catalog variant OR a custom constructor
  configuration (JSON), enforced by a DB check constraint.
"""

from django.conf import settings
from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "Новый"
        CONFIRMED = "confirmed", "Подтверждён"
        SHIPPED = "shipped", "Отправлен"
        DONE = "done", "Завершён"
        CANCELLED = "cancelled", "Отменён"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Ожидает оплаты"
        PAID = "paid", "Оплачен"
        FAILED = "failed", "Ошибка оплаты"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="Пользователь",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
    )
    status = models.CharField("Статус", max_length=20, choices=Status, default=Status.NEW)
    payment_status = models.CharField(
        "Статус оплаты", max_length=20, choices=PaymentStatus, default=PaymentStatus.PENDING
    )

    customer_name = models.CharField("Имя", max_length=100)
    customer_phone = models.CharField("Телефон", max_length=20)
    customer_email = models.EmailField("Email")
    comment = models.TextField("Комментарий (адрес, пожелания)", blank=True)

    total = models.DecimalField("Сумма, ₽", max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Заказ #{self.pk} — {self.customer_name}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, verbose_name="Заказ", on_delete=models.CASCADE, related_name="items"
    )
    # SET_NULL: удаление товара из каталога не трогает историю заказов —
    # все данные ниже зафиксированы снапшотом.
    variant = models.ForeignKey(
        "catalog.ProductVariant",
        verbose_name="Вариант товара",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="order_items",
    )
    # Снапшот на момент покупки
    product_name = models.CharField("Название", max_length=250)
    sku = models.CharField("SKU", max_length=64, blank=True)
    price = models.DecimalField("Цена на момент покупки, ₽", max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField("Количество", default=1)
    # Конфигурация из конструктора (для кастомных позиций)
    custom_config = models.JSONField("Конфигурация конструктора", null=True, blank=True)

    class Meta:
        verbose_name = "Позиция заказа"
        verbose_name_plural = "Позиции заказов"
        constraints = [
            # Позиция — либо каталожный вариант, либо кастомная конфигурация.
            models.CheckConstraint(
                condition=(models.Q(variant__isnull=False) | models.Q(custom_config__isnull=False)),
                name="order_item_variant_or_custom",
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name="order_item_quantity_gte_1",
            ),
        ]

    def __str__(self):
        return f"{self.product_name} × {self.quantity}"

    @property
    def line_total(self):
        return self.price * self.quantity
