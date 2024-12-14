# accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'role', 'department', 'phone', 'join_date', 'is_active')
    list_filter = ('role', 'department', 'is_active')
    search_fields = ('username', 'first_name', 'last_name', 'phone')
    ordering = ('-date_joined',)
    
    # UserAdmin의 필드셋에 커스텀 필드 추가
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('개인정보', {'fields': ('first_name', 'last_name', 'email', 'phone', 'profile_image')}),
        ('소속정보', {'fields': ('department', 'role', 'join_date')}),
        ('권한', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('중요 일자', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'role', 'department'),
        }),
    )