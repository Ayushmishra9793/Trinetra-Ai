from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('unified_api.urls')),
    path('api/v1/web3/', include('web3_profiler.urls')),
]
