from django.urls import reverse
from rest_framework import status

from .helpers import FootballAPITestCase


class AuthenticationAPITests(FootballAPITestCase):
    def test_valid_credentials_return_access_and_refresh_tokens(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "admin", "password": "password123"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_invalid_credentials_are_rejected(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "admin", "password": "wrong"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_returns_access_token(self):
        tokens = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "admin", "password": "password123"},
        ).data
        response = self.client.post(
            reverse("token_refresh"), {"refresh": tokens["refresh"]}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)


class PermissionAPITests(FootballAPITestCase):
    def test_anonymous_public_get_is_allowed(self):
        response = self.client.get(reverse("event-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_anonymous_write_is_rejected(self):
        response = self.client.post(
            reverse("team-list"), {"name": "New", "code": "NEW"}
        )
        self.assertIn(
            response.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    def test_authenticated_non_staff_write_is_rejected(self):
        self.authenticate_user()
        response = self.client.post(
            reverse("team-list"), {"name": "New", "code": "NEW"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_write_is_allowed(self):
        self.authenticate_staff()
        response = self.client.post(
            reverse("team-list"), {"name": "New", "code": "NEW"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_match_actions_require_staff(self):
        url = reverse("match-start", args=[self.match.pk])
        anonymous = self.client.post(url, {})
        self.authenticate_user()
        normal_user = self.client.post(url, {})

        self.assertIn(anonymous.status_code, {401, 403})
        self.assertEqual(normal_user.status_code, 403)
