from rest_framework import serializers

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
    """
    Конфигурация конструктора. Слаги валидируются по БД
    (catalog.ConstructorOption) в pricing.resolve_config при создании заказа.
    """

    size = serializers.SlugField()
    bag_color = serializers.SlugField()
    zipper_color = serializers.SlugField()
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


class DeliverySerializer(serializers.Serializer):
    """Доставка: стоимость клиент не передаёт — сервер посчитает сам."""

    method = serializers.ChoiceField(choices=["cdek_pvz", "cdek_courier", "post"])
    city_code = serializers.IntegerField(required=False)  # код города СДЭК
    city_name = serializers.CharField(max_length=150)
    postcode = serializers.RegexField(regex=r"^\d{6}$", required=False, allow_blank=True)
    address = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")
    pvz_code = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")
    pvz_address = serializers.CharField(
        max_length=300, required=False, allow_blank=True, default=""
    )

    def validate(self, attrs):
        method = attrs["method"]
        if method in ("cdek_pvz", "cdek_courier") and not attrs.get("city_code"):
            raise serializers.ValidationError({"city_code": "Выберите город из списка."})
        if method == "cdek_pvz" and not attrs.get("pvz_code"):
            raise serializers.ValidationError({"pvz_code": "Выберите пункт выдачи."})
        if method == "cdek_courier" and not attrs.get("address"):
            raise serializers.ValidationError({"address": "Укажите адрес доставки."})
        if method == "post":
            if not attrs.get("postcode"):
                raise serializers.ValidationError({"postcode": "Укажите почтовый индекс."})
            if not attrs.get("address"):
                raise serializers.ValidationError({"address": "Укажите адрес доставки."})
        return attrs


class CheckoutSerializer(serializers.Serializer):
    """Входные данные оформления заказа. Цены клиент не передаёт."""

    customer = CustomerSerializer()
    items = CheckoutItemSerializer(many=True, allow_empty=False)
    delivery = DeliverySerializer()


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
            "delivery_method",
            "delivery_cost",
            "delivery_city",
            "delivery_postcode",
            "delivery_address",
            "delivery_pvz_code",
            "delivery_pvz_address",
            "total",
            "items",
            "created_at",
        ]
