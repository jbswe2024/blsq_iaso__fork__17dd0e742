# Generated by Django 3.2.13 on 2022-04-12 12:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("polio", "0049_merge_20220412_1146"),
    ]

    operations = [
        migrations.AlterField(
            model_name="campaigngroup",
            name="campaigns",
            field=models.ManyToManyField(related_name="grouped_campaigns", to="polio.Campaign"),
        ),
    ]
