from django.conf import settings
from django.db import models


class Profile(models.Model):
    """Доп. данные пользователя, которых нет в стандартной User-модели."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        verbose_name="Пользователь",
        on_delete=models.CASCADE,
        related_name="profile",
    )
    phone = models.CharField("Телефон", max_length=20, blank=True)
    # Факт и время согласия на обработку ПДн (152-ФЗ): фиксируем при регистрации.
    personal_data_consent_at = models.DateTimeField(
        "Согласие на обработку ПДн", null=True, blank=True
    )

    class Meta:
        verbose_name = "Профиль"
        verbose_name_plural = "Профили"

    def __str__(self):
        return f"Профиль {self.user.username}"
