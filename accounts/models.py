# accounts/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # AbstractUser의 기본 필드들:
    # username, password, first_name, last_name, email, is_staff, is_active, date_joined
    
    ROLE_CHOICES = [
        ('admin', '관리자'),
        ('branch_manager', '지점장'),
        ('team_leader', '팀장'),
        ('staff', '직원'),
    ]
    
    # 추가 필드들
    role = models.CharField('역할', max_length=20, choices=ROLE_CHOICES, default='staff')
    phone = models.CharField('전화번호', max_length=11, blank=True)
    join_date = models.DateField('입사일', null=True, blank=True)
    profile_image = models.ImageField('프로필 이미지', upload_to='profiles/', blank=True, null=True)
    department = models.CharField('부서', max_length=50, blank=True)
    
    class Meta:
        verbose_name = '사용자'
        verbose_name_plural = '사용자 목록'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def get_full_name(self):
        return f"{self.last_name}{self.first_name}"
    
    