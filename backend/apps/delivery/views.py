from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import quotes
from .services import cdek


class CitySerializer(serializers.Serializer):
    code = serializers.IntegerField()
    full_name = serializers.CharField()


class PointSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    address = serializers.CharField()
    work_time = serializers.CharField()


class QuoteSerializer(serializers.Serializer):
    method = serializers.CharField()
    name = serializers.CharField()
    price = serializers.FloatField()
    days = serializers.CharField()


class QuoteRequestSerializer(serializers.Serializer):
    city_code = serializers.IntegerField(required=False)
    postcode = serializers.RegexField(regex=r"^\d{6}$", required=False)
    items = serializers.ListField(child=serializers.DictField(), allow_empty=False)


@extend_schema(responses=CitySerializer(many=True))
@api_view(["GET"])
@permission_classes([AllowAny])
def cities(request):
    """Подсказки городов (справочник СДЭК)."""
    query = (request.query_params.get("q") or "").strip()
    if len(query) < 2:
        return Response([])
    return Response(cdek.suggest_cities(query))


@extend_schema(responses=PointSerializer(many=True))
@api_view(["GET"])
@permission_classes([AllowAny])
def points(request):
    """Пункты выдачи СДЭК в городе."""
    try:
        city_code = int(request.query_params.get("city_code", ""))
    except ValueError:
        return Response([])
    return Response(cdek.delivery_points(city_code))


@extend_schema(request=QuoteRequestSerializer, responses=QuoteSerializer(many=True))
@api_view(["POST"])
@permission_classes([AllowAny])
def quote(request):
    """Варианты доставки с ценами; вес корзины считает сервер."""
    serializer = QuoteRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    weight = quotes.cart_weight_grams(data["items"])
    return Response(quotes.quote_all(data.get("city_code"), data.get("postcode"), weight))
