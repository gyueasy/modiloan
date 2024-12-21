from django.urls import path
from . import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from .views import test_auth_view

app_name = 'accounts'

urlpatterns = [
    path('register/', views.register_view, name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),  # 로그인 API
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('profile/edit/', views.profile_edit_view, name='profile_edit'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # 액세스, 리프레시 토큰 발급
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # 리프레시 토큰을 사용해 액세스 토큰 재발급
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'), 
    path('api/test-auth/', test_auth_view, name='test-auth'),   # 토큰 검증
]
