# Generated by Django 3.1.13 on 2021-10-28 14:36

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("menupermissions", "0022_add_permission_polio_to_existing_users"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="custompermissionsupport",
            options={
                "managed": False,
                "permissions": (
                    ("x_modifications", "Modifications"),
                    ("x_management_teams", "Teams"),
                    ("x_management_users", "Utilisateurs"),
                    ("iaso_forms", "Formulaires"),
                    ("iaso_mappings", "Correspondances avec DHIS2"),
                    ("iaso_completeness", "Complétude des données"),
                    ("iaso_org_units", "Unités d'organisations"),
                    ("iaso_links", "Correspondances sources"),
                    ("iaso_users", "Utilisateurs"),
                    ("iaso_pages", "Pages"),
                    ("iaso_projects", "Projets"),
                    ("iaso_sources", "Sources"),
                    ("iaso_data_tasks", "Tâches"),
                    ("iaso_polio", "Polio"),
                    ("iaso_submissions", "Soumissions"),
                ),
            },
        ),
    ]
