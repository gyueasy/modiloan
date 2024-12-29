from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import TodoViewSet, TodoTemplateViewSet

router = DefaultRouter()
router.register('templates', TodoTemplateViewSet, basename='todo-template')
router.register('', TodoViewSet, basename='todo')

urlpatterns = [
    path('', include(router.urls)),
]