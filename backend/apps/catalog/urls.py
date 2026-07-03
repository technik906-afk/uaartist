from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ProductViewSet

app_name = "catalog"

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("categories", CategoryViewSet, basename="category")

urlpatterns = router.urls
