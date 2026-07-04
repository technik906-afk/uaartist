from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import CheckoutSerializer, OrderReadSerializer
from .services import create_order


class OrderViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Оформление заказа (гостевой чекаут). Списка/деталей публично нет."""

    serializer_class = CheckoutSerializer
    permission_classes = [AllowAny]
    throttle_scope = "orders"

    @extend_schema(request=CheckoutSerializer, responses={201: OrderReadSerializer})
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = create_order(user=request.user, **serializer.validated_data)
        return Response(OrderReadSerializer(order).data, status=status.HTTP_201_CREATED)
