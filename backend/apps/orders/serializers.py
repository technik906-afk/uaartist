from rest_framework import serializers

from . import pricing
from .models import Order, OrderItem


class CustomerSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=100)
    phone = serializers.RegexField(
        regex=r"^[\d\s+\-()]{6,20}$",
        error_messages={"invalid": "Введите корректный номер телефона."},
    )
    email = serializers.EmailField()
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000, default="")


class CustomConfigSerializer(serializers.Serializer):
    """Конфигурация конструктора; цена считается на сервере (pricing.py)."""

    size = serializers.ChoiceField(choices=list(pricing.SIZES))
    bag_color = serializers.ChoiceField(choices=list(pricing.BAG_COLORS))
    zipper_color = serializers.ChoiceField(choices=list(pricing.ZIPPER_COLORS))
    tassel = serializers.BooleanField(default=False)


class CheckoutItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(required=False)
    custom = CustomConfigSerializer(required=False)
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)

    def validate(self, attrs):
        has_variant = "variant_id" in attrs
        has_custom = "custom" in attrs
        if has_variant == has_custom:  # обе или ни одной
            raise serializers.ValidationError(
                "Позиция должна содержать либо variant_id, либо custom — ровно одно из двух."
            )
        return attrs


class CheckoutSerializer(serializers.Serializer):
    """Входные данные оформления заказа. Цены клиент не передаёт."""

    customer = CustomerSerializer()
    items = CheckoutItemSerializer(many=True, allow_empty=False)


class OrderItemReadSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["product_name", "sku", "price", "quantity", "custom_config", "line_total"]


class OrderReadSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "payment_status",
            "customer_name",
            "customer_phone",
            "customer_email",
            "comment",
            "total",
            "items",
            "created_at",
        ]
