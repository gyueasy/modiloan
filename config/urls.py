# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator

# Admin 사이트 전체에 CSRF 보호 적용 (여기 한번만 하면 됨)
admin.site.login = method_decorator(csrf_protect)(admin.site.login)
admin.site.logout = method_decorator(csrf_protect)(admin.site.logout)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/', include('core.urls')),
    path('web/', include('core.web_urls')),  # 웹페이지용 (/web/login/)
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)