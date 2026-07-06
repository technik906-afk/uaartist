import logging

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.orders.models import Order

from . import services
from .serializers import (
    PaymentCreateSerializer,
    PaymentReadSerializer,
    PaymentStatusResponseSerializer,
)

logger = logging.getLogger(__name__)


class PaymentsCreateThrottle(ScopedRateThrottle):
    scope = "payments"


class PaymentsStatusThrottle(ScopedRateThrottle):
    scope = "payments_status"


def _get_order_or_404(order_id: int, email: str) -> Order | None:
    """Заказ по id + email: слабая проверка принадлежности для гостей."""
    return Order.objects.filter(pk=order_id, customer_email__iexact=email).first()


@extend_schema(request=PaymentCreateSerializer, responses={201: PaymentReadSerializer})
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PaymentsCreateThrottle])
def create_payment(request):
    """Создать (или переиспользовать незавершённый) платёж по заказу."""
    serializer = PaymentCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    order = _get_order_or_404(**serializer.validated_data)
    if order is None:
        return Response({"detail": "Заказ не найден."}, status=status.HTTP_404_NOT_FOUND)
    services.validation_error_if_not_payable(order)

    try:
        payment = services.create_payment(order)
    except services.PaymentsNotConfigured:
        return Response(
            {"detail": "Онлайн-оплата временно недоступна."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response(PaymentReadSerializer(payment).data, status=status.HTTP_201_CREATED)


@extend_schema(responses=PaymentStatusResponseSerializer)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([PaymentsStatusThrottle])
def payment_status(request):
    """Статус оплаты заказа (для поллинга со страницы «Спасибо»)."""
    serializer = PaymentCreateSerializer(
        data={
            "order_id": request.query_params.get("order_id"),
            "email": request.query_params.get("email"),
        }
    )
    serializer.is_valid(raise_exception=True)

    order = _get_order_or_404(**serializer.validated_data)
    if order is None:
        return Response({"detail": "Заказ не найден."}, status=status.HTTP_404_NOT_FOUND)

    payment = order.payments.first()
    if payment and not payment.is_terminal:
        try:
            payment = services.sync_payment(payment)
        except services.PaymentsNotConfigured:
            pass  # оплата выключена — отдаём то, что есть

    return Response(
        {
            "order_id": order.pk,
            "payment_status": order.payment_status,
            "payment": PaymentReadSerializer(payment).data if payment else None,
        }
    )


@extend_schema(request=None, responses=None)
@api_view(["POST"])
@permission_classes([AllowAny])
def yookassa_webhook(request):
    """
    Приём уведомлений ЮKassa. Всегда 200 (иначе провайдер ретраит),
    статус перечитывается из API — телу уведомления не доверяем.
    """
    try:
        services.handle_webhook(request.data)
    except services.PaymentsNotConfigured:
        logger.warning("Webhook при выключенной оплате — игнорирую")
    except Exception:
        logger.exception("Ошибка обработки webhook ЮKassa")
    return Response({"ok": True})
