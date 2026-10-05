from django.apps import AppConfig


class FootballConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'football'

    def ready(self):
        from football.realtime import signals  # noqa: F401
