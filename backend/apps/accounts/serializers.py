from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .models import Profile


class RegisterSerializer(serializers.Serializer):
    """Регистрация: email (= username), имя, телефон, пароль, согласие на ПДн."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    name = serializers.CharField(max_length=100)
    phone = serializers.RegexField(
        regex=r"^[\d\s+\-()]{6,20}$",
        error_messages={"invalid": "Введите корректный номер телефона."},
    )
    consent = serializers.BooleanField()

    def validate_email(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError(
                "Для регистрации необходимо согласие на обработку персональных данных."
            )
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["name"],
        )
        Profile.objects.create(
            user=user,
            phone=validated_data["phone"],
            personal_data_consent_at=timezone.now(),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source="profile.phone", read_only=True, default="")

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "date_joined"]
        read_only_fields = fields
