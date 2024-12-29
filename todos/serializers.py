# serializers.py
from rest_framework import serializers
from .models import Todo
from core.models import LoanCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import TodoTemplate, TodoHistory

User = get_user_model()


class TodoLoanCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanCase
        fields = ['id', 'borrower_name', 'status', 'status_display']


class TodoUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']  # name 필드 제거


class TodoSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source='get_status_display', read_only=True)
    priority_display = serializers.CharField(
        source='get_priority_display', read_only=True)
    loan_case_detail = TodoLoanCaseSerializer(
        source='loan_case', read_only=True)
    created_by_detail = TodoUserSerializer(source='created_by', read_only=True)
    assigned_to_detail = TodoUserSerializer(
        source='assigned_to', read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Todo
        fields = [
            'id', 'loan_case', 'loan_case_detail',
            'title', 'content', 'created_at', 'deadline',
            'status', 'status_display', 'priority', 'priority_display',
            'created_by', 'created_by_detail',
            'assigned_to', 'assigned_to_detail',
            'is_archived', 'is_overdue'
        ]
        read_only_fields = ['created_at', 'created_by']

    def get_is_overdue(self, obj):
        if obj.deadline:
            return obj.deadline < timezone.now()
        return False

    # 대출 건별 필터링을 위한 메서드
    def to_representation(self, instance):
        # 아카이브되지 않은 할 일만 표시
        if instance.is_archived:
            return None
        return super().to_representation(instance)

class TodoTemplateSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = TodoTemplate
        fields = ['id', 'title', 'content', 'priority', 'created_by', 'created_by_username', 'created_at']
        read_only_fields = ['created_by', 'created_at']

class TodoHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = TodoHistory
        fields = ['id', 'todo', 'changed_by', 'changed_by_username', 'changed_at', 'field_name', 'old_value', 'new_value']
        read_only_fields = ['changed_by', 'changed_at']