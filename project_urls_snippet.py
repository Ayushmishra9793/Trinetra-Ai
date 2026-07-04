# ============================================================
# <project_name>/urls.py  (the project-level file, NOT unified_api's)
# Add this to wire the app's URLs under /api/
# ============================================================

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('unified_api.urls')),
]
