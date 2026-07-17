from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("auth/register/", views.register, name="register"),
    path("auth/token/", views.ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", views.ThrottledTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", views.me, name="me"),
    path("auth/password/change/", views.password_change, name="password_change"),
    path("auth/password/reset/", views.password_reset, name="password_reset"),
    path(
        "auth/password/reset/confirm/",
        views.password_reset_confirm,
        name="password_reset_confirm",
    ),
]
