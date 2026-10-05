from functools import partial

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from football.models import Match, MatchEvent, MatchStatus

from .broadcasts import broadcast_match_event, broadcast_match_status


@receiver(pre_save, sender=Match, dispatch_uid="football.realtime.match_pre_save")
def remember_previous_match_status(sender, instance, **kwargs):
    instance._realtime_previous_status = None
    if instance._state.adding:
        return
    try:
        instance._realtime_previous_status = sender.objects.only("status").get(
            pk=instance.pk
        ).status
    except sender.DoesNotExist:
        pass


@receiver(post_save, sender=Match, dispatch_uid="football.realtime.match_post_save")
def schedule_match_status_broadcast(sender, instance, created, **kwargs):
    if created:
        return
    transition = (getattr(instance, "_realtime_previous_status", None), instance.status)
    if transition not in {
        (MatchStatus.SCHEDULED, MatchStatus.LIVE),
        (MatchStatus.LIVE, MatchStatus.FINISHED),
    }:
        return
    transaction.on_commit(partial(broadcast_match_status, instance.pk))


@receiver(
    post_save,
    sender=MatchEvent,
    dispatch_uid="football.realtime.match_event_post_save",
)
def schedule_match_event_broadcast(sender, instance, created, **kwargs):
    if created:
        transaction.on_commit(partial(broadcast_match_event, instance.pk))
