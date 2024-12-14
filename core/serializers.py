# core/serializers.py
from rest_framework import serializers
from .models import LoanCase
from core.models import Event

class LoanCaseSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    business_type_display = serializers.CharField(source='get_business_type_display', read_only=True)
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)

    class Meta:
        model = LoanCase
        fields = [
            'id', 'status', 'status_display', 'borrower_name', 'borrower_phone',
            'loan_amount', 'created_at', 'updated_at', 'is_urgent',
            'business_type', 'business_type_display', 'manager', 'manager_name'
        ]

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'