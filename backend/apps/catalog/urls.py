from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ProductViewSet, constructor_options

app_name = "catalog"

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("categories", CategoryViewSet, basename="category")

urlpatterns = [
    path("constructor/options/", constructor_options, name="constructor-options"),
    *router.urls,
]
