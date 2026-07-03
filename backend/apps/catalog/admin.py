from django.contrib import admin

from .models import Attribute, AttributeValue, Category, Product, ProductImage, ProductVariant


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ["image", "alt_text", "sort_order", "is_main"]


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ["sku", "price", "stock", "is_active", "attribute_values"]
    filter_horizontal = ["attribute_values"]


class AttributeValueInline(admin.TabularInline):
    model = AttributeValue
    extra = 1
    prepopulated_fields = {"slug": ["value"]}


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "parent", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "is_active", "created_at"]
    list_filter = ["is_active", "category"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ["name"]}
    list_select_related = ["category"]
    inlines = [ProductImageInline, ProductVariantInline]


@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ["name"]}
    inlines = [AttributeValueInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ["sku", "product", "price", "stock", "is_active"]
    list_editable = ["price", "stock", "is_active"]
    list_filter = ["is_active", "product__category"]
    search_fields = ["sku", "product__name"]
    list_select_related = ["product"]
    filter_horizontal = ["attribute_values"]
