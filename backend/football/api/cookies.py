from django.conf import settings


def _cookie_options(*, path):
    return {
        "httponly": True,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "path": path,
        "domain": settings.JWT_COOKIE_DOMAIN,
    }


def set_access_cookie(response, token):
    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        token,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        **_cookie_options(path=settings.JWT_ACCESS_COOKIE_PATH),
    )


def set_refresh_cookie(response, token):
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        **_cookie_options(path=settings.JWT_REFRESH_COOKIE_PATH),
    )


def clear_auth_cookies(response):
    common = {
        "domain": settings.JWT_COOKIE_DOMAIN,
        "samesite": settings.JWT_COOKIE_SAMESITE,
    }
    response.delete_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        path=settings.JWT_ACCESS_COOKIE_PATH,
        **common,
    )
    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        **common,
    )
