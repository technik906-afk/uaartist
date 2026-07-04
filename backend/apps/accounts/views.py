import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class AuthThrottle(ScopedRateThrottle):
    scope = "auth"


TOKENS_RESPONSE = inline_serializer(
    name="TokenPair",
    fields={
        "access": serializers.CharField(),
        "refresh": serializers.CharField(),
    },
)

DETAIL_RESPONSE = inline_serializer(
    name="Detail",
    fields={"detail": serializers.CharField()},
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


@extend_schema(
    request=ProfileUpdateSerializer,
    responses=UserSerializer,
    methods=["PATCH"],
)
@extend_schema(responses=UserSerializer, methods=["GET"])
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    """Профиль текущего пользователя: чтение и частичное обновление."""
    if request.method == "PATCH":
        serializer = ProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        request.user.refresh_from_db()
    return Response(UserSerializer(request.user).data)


@extend_schema(request=PasswordChangeSerializer, responses=DETAIL_RESPONSE)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def password_change(request):
    """Смена пароля: требует текущий пароль."""
    serializer = PasswordChangeSerializer(data=request.data, context={"user": request.user})
    serializer.is_valid(raise_exception=True)
    request.user.set_password(serializer.validated_data["new_password"])
    request.user.save(update_fields=["password"])
    return Response({"detail": "Пароль изменён."})


@extend_schema(request=PasswordResetSerializer, responses=DETAIL_RESPONSE)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def password_reset(request):
    """
    Запрос сброса пароля: шлёт письмо со ссылкой.
    Ответ всегда одинаковый — существование email не раскрываем.
    """
    serializer = PasswordResetSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data["email"].lower()

    user = User.objects.filter(username__iexact=email, is_active=True).first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
        try:
            send_mail(
                subject="uaartist: сброс пароля",
                message=(
                    f"Здравствуйте!\n\n"
                    f"Для сброса пароля перейдите по ссылке:\n{link}\n\n"
                    f"Если вы не запрашивали сброс — просто проигнорируйте это письмо."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
            )
        except Exception:
            logger.exception("Не удалось отправить письмо сброса пароля")

    return Response({"detail": "Если такой email зарегистрирован, мы отправили письмо."})


@extend_schema(request=PasswordResetConfirmSerializer, responses=DETAIL_RESPONSE)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def password_reset_confirm(request):
    """Установка нового пароля по ссылке из письма."""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        user_pk = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
        user = User.objects.get(pk=user_pk, is_active=True)
    except (ValueError, User.DoesNotExist):
        return Response({"detail": "Ссылка недействительна."}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, serializer.validated_data["token"]):
        return Response(
            {"detail": "Ссылка недействительна или устарела."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(serializer.validated_data["new_password"])
    user.save(update_fields=["password"])
    return Response({"detail": "Пароль изменён. Теперь можно войти."})
