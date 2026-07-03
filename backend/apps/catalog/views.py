from django.db.models import Exists, Max, Min, OuterRef, Prefetch, Q
from rest_framework import viewsets

from .filters import ProductFilter
from .models import Category, Product, ProductVariant
from .serializers import CategorySerializer, ProductDetailSerializer, ProductListSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Список категорий и категория по слагу."""

    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = "slug"
    pagination_class = None  # категорий немного — отдаём без пагинации
    filter_backends = []


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Каталог: список товаров (с фильтрами) и карточка по слагу."""

    serializer_class = ProductListSerializer
    lookup_field = "slug"
    filterset_class = ProductFilter
    search_fields = ["name", "description"]
    ordering_fields = ["price_min", "created_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        active_variants = ProductVariant.objects.filter(is_active=True)
        return (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related(
                "images",
                Prefetch(
                    "variants",
                    queryset=active_variants.prefetch_related("attribute_values__attribute"),
                ),
            )
            .annotate(
                price_min=Min("variants__price", filter=Q(variants__is_active=True)),
                price_max=Max("variants__price", filter=Q(variants__is_active=True)),
                in_stock=Exists(active_variants.filter(product=OuterRef("pk"), stock__gt=0)),
            )
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer
