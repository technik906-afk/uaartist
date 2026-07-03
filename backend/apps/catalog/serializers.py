"""Catalog serializers: lean list shape, full detail shape."""

from rest_framework import serializers

from .models import AttributeValue, Category, Product, ProductImage, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "description"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "sort_order", "is_main"]


class AttributeValueSerializer(serializers.ModelSerializer):
    attribute = serializers.CharField(source="attribute.name", read_only=True)
    attribute_slug = serializers.SlugField(source="attribute.slug", read_only=True)

    class Meta:
        model = AttributeValue
        fields = ["id", "attribute", "attribute_slug", "value", "slug", "color_hex"]


class ProductVariantSerializer(serializers.ModelSerializer):
    attribute_values = AttributeValueSerializer(many=True, read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "price", "stock", "in_stock", "attribute_values"]


class ProductListSerializer(serializers.ModelSerializer):
    """Lean shape for catalog grids: main image + price range, no heavy nesting."""

    category = serializers.SlugField(source="category.slug", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    main_image = serializers.SerializerMethodField()
    # Annotated in the viewset queryset.
    price_min = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    price_max = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "category_name",
            "main_image",
            "price_min",
            "price_max",
            "in_stock",
        ]

    def get_main_image(self, obj) -> dict | None:
        # Uses the prefetched cache: is_main first, otherwise first by sort_order.
        images = list(obj.images.all())
        if not images:
            return None
        main = next((img for img in images if img.is_main), images[0])
        return ProductImageSerializer(main, context=self.context).data


class ProductDetailSerializer(ProductListSerializer):
    """Full shape for the product page: description, gallery, variants, SEO."""

    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "description",
            "images",
            "variants",
            "meta_title",
            "meta_description",
        ]
