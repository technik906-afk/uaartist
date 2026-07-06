from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ["variant", "product_name", "sku", "price", "quantity", "custom_config"]

    def has_add_permission(self, request, obj=None):
        return False  # состав заказа фиксируется при оформлении


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "customer_name",
        "customer_phone",
        "delivery_method",
        "total",
        "status",
        "payment_status",
        "created_at",
    ]
    list_editable = ["status", "payment_status"]
    list_filter = ["status", "payment_status", "delivery_method", "created_at"]
    search_fields = ["id", "customer_name", "customer_phone", "customer_email", "delivery_city"]
    readonly_fields = ["total", "delivery_cost", "created_at", "updated_at"]
    inlines = [OrderItemInline]
    date_hierarchy = "created_at"
