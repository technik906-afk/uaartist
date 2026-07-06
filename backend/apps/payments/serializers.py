from rest_framework import serializers

from .models import Payment


class PaymentCreateSerializer(serializers.Serializer):
    """Создание платежа: заказ + email для лёгкой проверки принадлежности."""

    order_id = serializers.IntegerField(min_value=1)
    email = serializers.EmailField()


class PaymentReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["provider_payment_id", "status", "amount", "confirmation_url", "created_at"]


class PaymentStatusResponseSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    payment_status = serializers.CharField()
    payment = PaymentReadSerializer(allow_null=True)
