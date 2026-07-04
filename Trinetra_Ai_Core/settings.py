from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-=8sx5a35so1e!f*j@e6t8f_9#*wia$u&)xl-4728lxoxl#lf%y'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # --- Third-party ---
    'rest_framework',      # Django REST Framework: turns Django into a JSON API
    'corsheaders',         # Lets the Chrome extension (a different origin) call our API

    # --- Our apps (the 4 folders from the doc) ---
    'ai_scanner',
    'web3_profiler',
    'unified_api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # must sit high in the list
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'Trinetra_Ai_Core.urls'

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

WSGI_APPLICATION = 'Trinetra_Ai_Core.wsgi.application'


# ------------------------------------------------------------
# Database: SQLite is fine for the hackathon/demo. For production
# swap to Postgres by changing ENGINE + adding credentials.
# ------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'


# ------------------------------------------------------------
# WHY CORS matters here:
# A Chrome extension's background.js runs on a chrome-extension://
# origin, not http://localhost:8000. Browsers block cross-origin
# requests by default. CORS_ALLOWED_ORIGINS whitelists the
# extension so its fetch() calls aren't silently rejected.
# ------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    # Replace with your actual extension ID once you load it unpacked:
    # chrome-extension://<your-extension-id>
]
# During early development only, you can use this instead (less secure):
# CORS_ALLOW_ALL_ORIGINS = True


REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # Throttling matters here: this endpoint is hit on EVERY tab
        # change by EVERY installed copy of the extension. Without a
        # rate limit, one runaway client (or a malicious actor) can
        # hammer the Gemini API and blow through your quota/budget.
        'anon': '60/min',
    },
}



