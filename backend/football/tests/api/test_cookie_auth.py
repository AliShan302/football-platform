from django.conf import settings
from django.urls import reverse
from rest_framework.test import APIClient

from .helpers import FootballAPITestCase


class CookieAuthenticationAPITests(FootballAPITestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient(enforce_csrf_checks=True)
        response = self.client.get(reverse("auth_csrf"))
        self.csrf_token = response.data["csrfToken"]

    def login(self, username="admin", password="password123"):
        return self.client.post(
            reverse("auth_login"),
            {"username": username, "password": password},
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )

    def test_csrf_bootstrap_sets_cookie(self):
        self.assertIn("csrftoken", self.client.cookies)
        self.assertTrue(self.csrf_token)

    def test_login_sets_httponly_scoped_cookies_without_returning_tokens(self):
        response = self.login()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["username"], "admin")
        self.assertTrue(response.data["user"]["is_staff"])
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        access = response.cookies[settings.JWT_ACCESS_COOKIE_NAME]
        refresh = response.cookies[settings.JWT_REFRESH_COOKIE_NAME]
        self.assertTrue(access["httponly"])
        self.assertTrue(refresh["httponly"])
        self.assertEqual(access["path"], "/api/")
        self.assertEqual(refresh["path"], "/api/auth/")

    def test_invalid_login_and_missing_csrf_are_rejected(self):
        invalid = self.login(password="wrong")
        missing_csrf_client = APIClient(enforce_csrf_checks=True)
        missing = missing_csrf_client.post(
            reverse("auth_login"),
            {"username": "admin", "password": "password123"},
        )
        self.assertEqual(invalid.status_code, 401)
        self.assertEqual(missing.status_code, 403)

    def test_cookie_staff_write_requires_valid_csrf(self):
        self.login()
        success = self.client.post(
            reverse("team-list"),
            {"name": "New", "code": "NEW"},
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )
        missing = self.client.post(
            reverse("team-list"),
            {"name": "Other", "code": "OTH"},
        )
        self.assertEqual(success.status_code, 201)
        self.assertEqual(missing.status_code, 403)

    def test_non_staff_cookie_user_is_forbidden(self):
        self.login(username="user")
        response = self.client.post(
            reverse("team-list"),
            {"name": "New", "code": "NEW"},
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )
        self.assertEqual(response.status_code, 403)

    def test_refresh_uses_cookie_and_sets_only_new_access_cookie(self):
        self.login()
        del self.client.cookies[settings.JWT_ACCESS_COOKIE_NAME]
        response = self.client.post(
            reverse("auth_refresh"),
            {},
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"authenticated": True})
        self.assertIn(settings.JWT_ACCESS_COOKIE_NAME, response.cookies)
        self.assertNotIn("access", response.data)

    def test_invalid_refresh_is_rejected(self):
        self.client.cookies[settings.JWT_REFRESH_COOKIE_NAME] = "invalid"
        response = self.client.post(
            reverse("auth_refresh"),
            {},
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )
        self.assertEqual(response.status_code, 401)

    def test_me_returns_minimal_user_data(self):
        self.login()
        response = self.client.get(reverse("auth_me"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.data["user"]),
            {"id", "username", "is_staff"},
        )

    def test_logout_clears_cookies_even_without_access_cookie(self):
        self.login()
        del self.client.cookies[settings.JWT_ACCESS_COOKIE_NAME]
        response = self.client.post(
            reverse("auth_logout"),
            {},
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.cookies[settings.JWT_ACCESS_COOKIE_NAME]["max-age"], 0)
        self.assertEqual(response.cookies[settings.JWT_REFRESH_COOKIE_NAME]["max-age"], 0)
        self.assertEqual(response.cookies[settings.JWT_ACCESS_COOKIE_NAME]["path"], "/api/")
        self.assertEqual(response.cookies[settings.JWT_REFRESH_COOKIE_NAME]["path"], "/api/auth/")

    def test_bearer_header_remains_supported_without_csrf(self):
        raw_client = APIClient()
        token = raw_client.post(
            reverse("token_obtain_pair"),
            {"username": "admin", "password": "password123"},
        ).data["access"]
        response = raw_client.post(
            reverse("team-list"),
            {"name": "Bearer", "code": "BEA"},
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(response.status_code, 201)


class AnonymousCookieAuthTests(FootballAPITestCase):
    def test_unauthenticated_write_and_me_are_rejected(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertIn(client.post(reverse("team-list"), {}).status_code, {401, 403})
        self.assertEqual(client.get(reverse("auth_me")).status_code, 401)
