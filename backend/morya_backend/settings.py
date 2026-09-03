"""
Django settings for morya_backend project.
Production-ready configuration supporting PostgreSQL, MySQL, and SQLite.
"""

from pathlib import Path
import os
from datetime import timedelta
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file from backend root or parent root
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'morya-fitness-gym-management-production-secret-key-2026-sinnar'
)

DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ['true', '1', 'yes']

# Production Allowed Hosts
allowed_hosts_env = os.environ.get('DJANGO_ALLOWED_HOSTS', '*')
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_env.split(',') if h.strip()] or ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'corsheaders',
    'rest_framework',
    
    # Local apps
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Add whitenoise if installed in environment
try:
    import whitenoise
    MIDDLEWARE.insert(2, 'whitenoise.middleware.WhiteNoiseMiddleware')
except ImportError:
    pass

ROOT_URLCONF = 'morya_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'morya_backend.wsgi.application'

# ==============================================================================
# DATABASE CONFIGURATION (PostgreSQL / MySQL / SQLite)
# ==============================================================================
def parse_db_url(url_str: str) -> dict:
    parsed = urlparse(url_str)
    scheme = parsed.scheme.lower()
    
    if scheme in ['postgres', 'postgresql', 'pgsql']:
        engine = 'django.db.backends.postgresql'
        default_port = 5432
    elif scheme in ['mysql', 'mariadb']:
        engine = 'django.db.backends.mysql'
        default_port = 3306
    elif scheme == 'sqlite':
        db_path = parsed.path.lstrip('/') or str(BASE_DIR / 'db.sqlite3')
        return {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': db_path,
        }
    else:
        engine = 'django.db.backends.sqlite3'
        default_port = None

    return {
        'ENGINE': engine,
        'NAME': unquote(parsed.path.lstrip('/')) if parsed.path else 'morya_fitness_db',
        'USER': unquote(parsed.username) if parsed.username else '',
        'PASSWORD': unquote(parsed.password) if parsed.password else '',
        'HOST': parsed.hostname or 'localhost',
        'PORT': str(parsed.port or default_port),
        'CONN_MAX_AGE': 600,
    }


database_url = os.environ.get('DATABASE_URL')

if database_url:
    DATABASES = {
        'default': parse_db_url(database_url)
    }
elif os.environ.get('DB_ENGINE'):
    db_engine = os.environ.get('DB_ENGINE', 'django.db.backends.postgresql')
    DATABASES = {
        'default': {
            'ENGINE': db_engine,
            'NAME': os.environ.get('DB_NAME', 'morya_fitness_db'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432' if 'postgres' in db_engine else '3306'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'api.User'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 4,
        }
    },
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS & CSRF Settings
cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS')
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins_env.split(',') if o.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

csrf_trusted_env = os.environ.get('CSRF_TRUSTED_ORIGINS')
if csrf_trusted_env:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in csrf_trusted_env.split(',') if o.strip()]

LANGUAGE_CODE = 'en-in'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Email Configuration (Gmail SMTP)
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'noreply@moryafitness.com')

