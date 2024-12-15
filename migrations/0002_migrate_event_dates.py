# migrations/0002_migrate_event_dates.py

from django.db import migrations

def migrate_event_dates(apps, schema_editor):
    Event = apps.get_model('your_app_name', 'Event')
    for event in Event.objects.all():
        if event.authorizing_date:
            event.date = event.authorizing_date
            event.event_type = 'authorizing'
        elif event.journalizing_date:
            event.date = event.journalizing_date
            event.event_type = 'journalizing'
        elif event.scheduled_date:
            event.date = event.scheduled_date
            event.event_type = 'scheduled'
        event.save()

class Migration(migrations.Migration):

    dependencies = [
        ('your_app_name', 'previous_migration'),
    ]

    operations = [
        migrations.RunPython(migrate_event_dates),
    ]