from django.db import models
from django.conf import settings
from core.models import LoanCase

class Todo(models.Model):
    STATUS_CHOICES = (
        ('pending', '대기'),
        ('in_progress', '진행중'),
        ('completed', '완료'),
    )
    
    PRIORITY_CHOICES = (
        (1, '낮음'),
        (2, '보통'),
        (3, '높음'),
    )

    loan_case = models.ForeignKey(
        LoanCase, 
        on_delete=models.CASCADE, 
        related_name='todos',
        verbose_name='대출 건'
    )
    
    title = models.CharField(
        max_length=200,
        verbose_name='제목'
    )
    
    content = models.TextField(
        blank=True,
        verbose_name='내용'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일'
    )
    
    deadline = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name='마감일'
    )
    
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        verbose_name='상태'
    )
    
    priority = models.IntegerField(
        choices=PRIORITY_CHOICES, 
        default=2,
        verbose_name='우선순위'
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_todos',
        verbose_name='작성자'
    )
    
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_todos',
        verbose_name='담당자'
    )
    
    is_archived = models.BooleanField(
        default=False,
        verbose_name='보관 여부'
    )

    class Meta:
        ordering = ['-priority', 'deadline', '-created_at']
        verbose_name = '할일'
        verbose_name_plural = '할일 목록'

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
    
class TodoTemplate(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    priority = models.IntegerField(choices=Todo.PRIORITY_CHOICES, default=2)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='todo_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)

class TodoHistory(models.Model):
    todo = models.ForeignKey(Todo, on_delete=models.CASCADE, related_name='histories')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    changed_at = models.DateTimeField(auto_now_add=True)
    field_name = models.CharField(max_length=50)
    old_value = models.TextField(null=True)
    new_value = models.TextField(null=True)