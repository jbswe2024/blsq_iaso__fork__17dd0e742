# Generated by Django 3.2.13 on 2022-06-03 16:37

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("polio", "0058_budgetevent_status"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="budgetfiles",
            options={"verbose_name": "Budget File", "verbose_name_plural": "Budget Files"},
        ),
    ]
