# core/serializers.py
from rest_framework import serializers
from .models import LoanCase
from core.models import Event
from core.utils import format_phone_number


class LoanCaseSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source='get_status_display', read_only=True)
    business_type_display = serializers.CharField(
        source='get_business_type_display', read_only=True)
    manager_name = serializers.CharField(
        source='manager.get_full_name', read_only=True)

    class Meta:
        model = LoanCase
        fields = [
            'id', 'status', 'status_display', 'borrower_name', 'borrower_phone',
            'loan_amount', 'created_at', 'updated_at', 'is_urgent',
            'business_type', 'business_type_display', 'manager', 'manager_name',

            # 새로 추가된 필드들
            'referrer',
            'introducer',
            'loan_type',
            'business_number',
            'business_category',
            'business_item',
            'is_tenant'
        ]


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'


# serializers.py
class CsvExportSerializer(serializers.ModelSerializer):
    접수일자 = serializers.SerializerMethodField()
    진행여부 = serializers.CharField(source='status_display')
    래퍼 = serializers.CharField(source='referrer', default='-')
    차주 = serializers.CharField(source='borrower_name')
    기표일 = serializers.DateField(source='journalizing_date')
    사업자 = serializers.CharField(source='get_business_type_display')
    선후순위 = serializers.SerializerMethodField()
    세입자 = serializers.BooleanField(source='is_tenant')
    취급LTV = serializers.SerializerMethodField()
    신규추가대환 = serializers.CharField(source='loan_type')
    금액 = serializers.IntegerField(source='loan_amount')
    등급 = serializers.IntegerField(source='borrower_credit_score')
    금리 = serializers.FloatField(source='interest_rate')
    연락처 = serializers.SerializerMethodField()
    주소지 = serializers.SerializerMethodField()
    시세 = serializers.IntegerField(source='price_amount')
    전용 = serializers.FloatField(source='area')
    채권설정내역 = serializers.SerializerMethodField()
    비고 = serializers.SerializerMethodField()
    부가세대상 = serializers.CharField(source='get_vat_status_display')

    def get_접수일자(self, obj):
        if obj.reception_date:
            return obj.reception_date
        return obj.created_at.date() if obj.created_at else None

    def get_선후순위(self, obj):
        prior_loans = obj.prior_loans.all()
        return '후순위' if prior_loans.exists() else '선순위'

    def get_취급LTV(self, obj):
        prior_loans = obj.prior_loans.all()
        prior_loan_amount = sum(loan.amount for loan in prior_loans)

        loan_amount = obj.loan_amount or 0
        total_loan_amount = loan_amount + prior_loan_amount

        if obj.price_amount:
            return round((total_loan_amount / obj.price_amount) * 100, 2)
        return '-'

    def get_연락처(self, obj):
        return format_phone_number(obj.borrower_phone)

    def get_채권설정내역(self, obj):
        prior_loans = obj.prior_loans.all()
        return ', '.join([f"{loan.financial_company} {loan.amount}만원" for loan in prior_loans]) if prior_loans else '-'

    def get_비고(self, obj):
        consulting_logs = obj.consulting_logs.all()
        return ', '.join([log.content for log in consulting_logs]) if consulting_logs else '-'

    def get_주소지(self, obj):
        return f"{obj.address_main or ''} {obj.address_detail or ''}".strip()

    class Meta:
        model = LoanCase
        fields = [
            '접수일자', '진행여부', '래퍼', '차주', '기표일',
            '사업자', '선후순위', '세입자', '취급LTV',
            '신규추가대환', '금액', '등급', '금리',
            '연락처', '주소지', '시세', '전용',
            '채권설정내역', '비고', '부가세대상'
        ]
