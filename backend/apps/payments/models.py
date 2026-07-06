"""
Платежи.

Payment — попытка оплаты заказа через провайдера (ЮKassa).
На заказ может быть несколько попыток (отменённая + повторная),
поэтому FK, а не OneToOne. Статус заказа (Order.payment_status)
обновляется при синхронизации с провайдером — он источник истины.
"""

from django.db import models


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает оплаты"
        WAITING_FOR_CAPTURE = "waiting_for_capture", "Ожидает подтверждения"
        SUCCEEDED = "succeeded", "Успешен"
        CANCELED = "canceled", "Отменён"

    order = models.ForeignKey(
        "orders.Order",
        verbose_name="Заказ",
        on_delete=models.CASCADE,
        related_name="payments",
    )
    provider = models.CharField("Провайдер", max_length=20, default="yookassa")
    provider_payment_id = models.CharField("ID платежа у провайдера", max_length=64, unique=True)
    status = models.CharField("Статус", max_length=20, choices=Status, default=Status.PENDING)
    amount = models.DecimalField("Сумма, ₽", max_digits=10, decimal_places=2)
    confirmation_url = models.URLField("Ссылка на оплату", blank=True, max_length=500)

    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        verbose_name = "Платёж"
        verbose_name_plural = "Платежи"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Платёж {self.provider_payment_id} ({self.get_status_display()})"

    @property
    def is_terminal(self) -> bool:
        return self.status in (self.Status.SUCCEEDED, self.Status.CANCELED)
