from django.urls import path

from . import views

app_name = "delivery"

urlpatterns = [
    path("delivery/cities/", views.cities, name="cities"),
    path("delivery/points/", views.points, name="points"),
    path("delivery/quote/", views.quote, name="quote"),
]
