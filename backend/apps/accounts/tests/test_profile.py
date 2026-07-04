"""Редактирование профиля, смена пароля, сброс пароля по email."""

import re

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from .test_auth import CREDENTIALS, ME_URL, TOKEN_URL, register

CHANGE_URL = "/api/v1/auth/password/change/"
RESET_URL = "/api/v1/auth/password/reset/"
CONFIRM_URL = "/api/v1/auth/password/reset/confirm/"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture(autouse=True)
def _clear_throttle():
    cache.clear()


@pytest.fixture
def logged_in(api, db):
    access = register(api).json()["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return api


def login(api, password):
    return api.post(
        TOKEN_URL,
        {"username": CREDENTIALS["email"], "password": password},
        format="json",
    )


class TestProfileEdit:
    def test_patch_name_and_phone(self, logged_in):
        response = logged_in.patch(
            ME_URL, {"first_name": "Новое Имя", "phone": "+7 111 222-33-44"}, format="json"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Новое Имя"
        assert data["phone"] == "+7 111 222-33-44"

    def test_patch_only_name(self, logged_in):
        logged_in.patch(ME_URL, {"first_name": "Только Имя"}, format="json")
        data = logged_in.get(ME_URL).json()
        assert data["first_name"] == "Только Имя"
        assert data["phone"] == CREDENTIALS["phone"]  # телефон не тронут

    def test_patch_bad_phone_400(self, logged_in):
        assert logged_in.patch(ME_URL, {"phone": "abc"}, format="json").status_code == 400

    def test_patch_requires_auth(self, api, db):
        assert api.patch(ME_URL, {"first_name": "X"}, format="json").status_code == 401


class TestPasswordChange:
    def test_wrong_old_password_400(self, logged_in):
        response = logged_in.post(
            CHANGE_URL,
            {"old_password": "wrong-pass", "new_password": "N3w-Strong-Pass"},
            format="json",
        )
        assert response.status_code == 400

    def test_change_and_login_with_new(self, api, logged_in):
        response = logged_in.post(
            CHANGE_URL,
            {"old_password": CREDENTIALS["password"], "new_password": "N3w-Strong-Pass"},
            format="json",
        )
        assert response.status_code == 200
        fresh = APIClient()
        assert login(fresh, CREDENTIALS["password"]).status_code == 401  # старый умер
        assert login(fresh, "N3w-Strong-Pass").status_code == 200  # новый работает

    def test_weak_new_password_400(self, logged_in):
        response = logged_in.post(
            CHANGE_URL,
            {"old_password": CREDENTIALS["password"], "new_password": "123"},
            format="json",
        )
        assert response.status_code == 400


class TestPasswordReset:
    def test_unknown_email_same_response_no_mail(self, api, db, mailoutbox):
        response = api.post(RESET_URL, {"email": "ghost@example.com"}, format="json")
        assert response.status_code == 200  # не раскрываем существование
        assert len(mailoutbox) == 0

    def test_full_reset_flow(self, api, db, mailoutbox):
        register(api)
        api.credentials()  # разлогин

        response = api.post(RESET_URL, {"email": CREDENTIALS["email"]}, format="json")
        assert response.status_code == 200
        assert len(mailoutbox) == 1

        match = re.search(r"reset-password\?uid=([^&]+)&token=(\S+)", mailoutbox[0].body)
        assert match, mailoutbox[0].body
        uid, token = match.group(1), match.group(2)

        response = api.post(
            CONFIRM_URL,
            {"uid": uid, "token": token, "new_password": "R3set-Strong-Pass"},
            format="json",
        )
        assert response.status_code == 200, response.json()
        assert login(api, "R3set-Strong-Pass").status_code == 200
        assert login(api, CREDENTIALS["password"]).status_code == 401

    def test_bad_token_400(self, api, db, mailoutbox):
        register(api)
        api.credentials()
        api.post(RESET_URL, {"email": CREDENTIALS["email"]}, format="json")
        match = re.search(r"uid=([^&]+)&token=", mailoutbox[0].body)
        response = api.post(
            CONFIRM_URL,
            {"uid": match.group(1), "token": "fake-token", "new_password": "R3set-Strong-Pass"},
            format="json",
        )
        assert response.status_code == 400

    def test_token_single_use(self, api, db, mailoutbox):
        register(api)
        api.credentials()
        api.post(RESET_URL, {"email": CREDENTIALS["email"]}, format="json")
        match = re.search(r"uid=([^&]+)&token=(\S+)", mailoutbox[0].body)
        uid, token = match.group(1), match.group(2)
        payload = {"uid": uid, "token": token, "new_password": "R3set-Strong-Pass"}
        assert api.post(CONFIRM_URL, payload, format="json").status_code == 200
        # повторное использование той же ссылки — отказ (пароль уже сменён)
        assert api.post(CONFIRM_URL, payload, format="json").status_code == 400
