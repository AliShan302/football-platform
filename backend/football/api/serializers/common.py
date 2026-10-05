from copy import copy

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models.deletion import ProtectedError
from rest_framework import serializers, status
from rest_framework.response import Response


class FullCleanModelSerializer(serializers.ModelSerializer):
    """Run model validation against complete state for POST, PUT, and PATCH."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        model = self.Meta.model
        candidate = copy(self.instance) if self.instance is not None else model()
        for field_name, value in attrs.items():
            setattr(candidate, field_name, value)

        try:
            candidate.full_clean()
        except DjangoValidationError as exc:
            detail = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            raise serializers.ValidationError(detail) from exc
        return attrs


class ProtectedDeleteMixin:
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {
                    "code": "protected_resource",
                    "detail": "This resource is referenced by other records and cannot be deleted.",
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
