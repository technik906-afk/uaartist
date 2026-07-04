from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer


class AuthThrottle(ScopedRateThrottle):
    scope = "auth"


TOKENS_RESPONSE = inline_serializer(
    name="TokenPair",
    fields={
        "access": serializers.CharField(),
        "refresh": serializers.CharField(),
    },
)


@extend_schema(request=RegisterSerializer, responses={201: TOKENS_RESPONSE})
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def register(request):
    """Регистрация: создаёт пользователя и сразу выдаёт пару токенов (автологин)."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response(
        {"access": str(refresh.access_token), "refresh": str(refresh)},
        status=status.HTTP_201_CREATED,
    )


@extend_schema(responses=UserSerializer)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """Профиль текущего пользователя."""
    return Response(UserSerializer(request.user).data)
