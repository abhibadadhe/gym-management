import os
from django.db import migrations


def update_admin_email(apps, schema_editor):
    User = apps.get_model('api', 'User')
    env_email = (os.environ.get('EMAIL_HOST_USER') or 'gokulgugale99@gmail.com').strip()
    # Update admin user to Gokul Gugale's official email
    User.objects.filter(username='admin').update(
        email=env_email,
        first_name='Gokul',
        last_name='Gugale (Owner)'
    )
    # Ensure any old reference to abhibadadhe33@gmail.com is cleanly replaced
    User.objects.filter(email='abhibadadhe33@gmail.com').update(email=env_email)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_passwordresetotp'),
    ]

    operations = [
        migrations.RunPython(update_admin_email, reverse_code=migrations.RunPython.noop),
    ]
