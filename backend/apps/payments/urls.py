from django.urls import path

from . import views

app_name = "payments"

urlpatterns = [
    path("payments/create/", views.create_payment, name="create"),
    path("payments/status/", views.payment_status, name="status"),
    path("payments/yookassa/webhook/", views.yookassa_webhook, name="yookassa-webhook"),
]
