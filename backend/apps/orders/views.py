from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Order
from .serializers import CheckoutSerializer, OrderReadSerializer
from .services import create_order


class OrderViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Оформление заказа (гостевой чекаут) + история своих заказов."""

    serializer_class = CheckoutSerializer
    permission_classes = [AllowAny]
    throttle_scope = "orders"

    @extend_schema(request=CheckoutSerializer, responses={201: OrderReadSerializer})
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = create_order(user=request.user, **serializer.validated_data)
        return Response(OrderReadSerializer(order).data, status=status.HTTP_201_CREATED)

    @extend_schema(responses=OrderReadSerializer(many=True))
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated], url_path="my")
    def my(self, request):
        """Заказы текущего пользователя (только свои)."""
        queryset = Order.objects.filter(user=request.user).prefetch_related("items")
        page = self.paginate_queryset(queryset)
        serializer = OrderReadSerializer(page if page is not None else queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)
