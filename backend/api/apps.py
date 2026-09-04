from django.apps import AppConfig
from django.db.models.signals import post_migrate


def sync_admin_email_on_migrate(sender, **kwargs):
    try:
        import os
        from django.contrib.auth import get_user_model
        User = get_user_model()
        env_email = (os.environ.get('EMAIL_HOST_USER') or 'gokulgugale99@gmail.com').strip()
        User.objects.filter(email='abhibadadhe33@gmail.com').update(email=env_email)
        User.objects.filter(username='admin').update(
            email=env_email,
            first_name='Gokul',
            last_name='Gugale (Owner)'
        )
    except Exception:
        pass


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        post_migrate.connect(sync_admin_email_on_migrate, sender=self)
