from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["provider_payment_id", "order", "amount", "status", "created_at"]
    list_filter = ["status", "provider"]
    search_fields = ["provider_payment_id", "order__id", "order__customer_email"]
    readonly_fields = [f.name for f in Payment._meta.fields]

    def has_add_permission(self, request):
        return False  # платежи создаются только через API
