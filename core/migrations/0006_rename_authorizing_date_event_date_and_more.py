# Generated by Django 4.2 on 2024-12-14 11:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_alter_loancase_status'),
    ]

    operations = [
        migrations.RenameField(
            model_name='event',
            old_name='authorizing_date',
            new_name='date',
        ),
        migrations.RemoveField(
            model_name='event',
            name='journalizing_date',
        ),
        migrations.RemoveField(
            model_name='event',
            name='scheduled_date',
        ),
        migrations.AddField(
            model_name='event',
            name='event_type',
            field=models.CharField(choices=[('scheduled', '접수'), ('authorizing', '자서'), ('journalizing', '기표')], default='scheduled', max_length=20),
        ),
    ]
