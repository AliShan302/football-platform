from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError

from football.api.cookies import (
    clear_auth_cookies,
    set_access_cookie,
    set_refresh_cookie,
)
from football.api.serializers import AuthUserSerializer


def _enforce_csrf(request):
    SessionAuthentication().enforce_csrf(request)


def _auth_response(user):
    return {
        "authenticated": True,
        "user": AuthUserSerializer(user).data,
    }


class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class CookieLoginView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        _enforce_csrf(request)
        serializer = TokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response = Response(_auth_response(serializer.user))
        set_access_cookie(response, serializer.validated_data["access"])
        set_refresh_cookie(response, serializer.validated_data["refresh"])
        return response


class CookieRefreshView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        _enforce_csrf(request)
        refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not refresh:
            raise InvalidToken("Refresh cookie is missing.")
        serializer = TokenRefreshSerializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(str(exc)) from exc
        response = Response({"authenticated": True})
        set_access_cookie(response, serializer.validated_data["access"])
        return response


class CookieLogoutView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        _enforce_csrf(request)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_auth_response(request.user))
