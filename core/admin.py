from django.contrib import admin
from .models import LoanCase, SecurityProvider, PriorLoan, ConsultingLog, CaseComment, Notice

class SecurityProviderInline(admin.TabularInline):
    model = SecurityProvider
    extra = 1

class PriorLoanInline(admin.TabularInline):
    model = PriorLoan
    extra = 1

class ConsultingLogInline(admin.TabularInline):
    model = ConsultingLog
    extra = 1
    readonly_fields = ('created_at', 'created_by')

class CaseCommentInline(admin.TabularInline):
    model = CaseComment
    extra = 1
    readonly_fields = ('created_at', 'writer')

@admin.register(LoanCase)
class LoanCaseAdmin(admin.ModelAdmin):
    list_display = ('borrower_name', 'loan_amount', 'interest_rate', 'status', 'reception_date', 'authorizing_date', 'journalizing_date', 'scheduled_date')
    list_filter = ('status', 'is_urgent')
    search_fields = ('borrower_name', 'borrower_phone')
    ordering = ('-created_at',)
    inlines = [SecurityProviderInline, PriorLoanInline, ConsultingLogInline, CaseCommentInline]
    fields = [
        'status', 'referrer', 'manager', 'created_at', 'updated_at',
        'borrower_name', 'borrower_birth', 'borrower_phone', 'borrower_credit_score',
        'address_main', 'address_detail', 'area',
        'is_lower_than_2nd', 'is_commercial_residential', 'is_above_4th_rank',
        'has_registration_issue', 'is_trading_price_low',
        'price_type', 'price_amount',
        'business_type', 'monthly_sales', 'vat_status', 'other_income',
        'is_fake_business', 'is_soho', 'need_proof_of_use', 'is_separate_household',
        'residents', 'loan_amount', 'interest_rate',
        'is_urgent', 'reception_date', 'authorizing_date', 'journalizing_date', 'scheduled_date',
        'status_changes',
    ]
    readonly_fields = ('created_at', 'updated_at')

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.manager = request.user
        super().save_model(request, obj, form, change)

@admin.register(SecurityProvider)
class SecurityProviderAdmin(admin.ModelAdmin):
    list_display = ('name', 'birth_date', 'phone', 'credit_score')
    search_fields = ('name', 'phone')
    fields = [
        'loan_case', 'name', 'birth_date', 'phone', 'credit_score',
        'related_person', 'relationship_type'
    ]

@admin.register(PriorLoan)
class PriorLoanAdmin(admin.ModelAdmin):
    list_display = ('loan_type', 'financial_company', 'amount')
    search_fields = ('financial_company',)
    fields = ['loan_case', 'loan_type', 'financial_company', 'amount']

@admin.register(ConsultingLog)
class ConsultingLogAdmin(admin.ModelAdmin):
    list_display = ('loan_case', 'created_at', 'created_by')
    readonly_fields = ('created_at', 'created_by')
    ordering = ('-created_at',)
    fields = ['loan_case', 'content', 'created_at', 'created_by']

@admin.register(CaseComment)
class CaseCommentAdmin(admin.ModelAdmin):
    list_display = ('loan_case', 'writer', 'is_question', 'created_at')
    readonly_fields = ('created_at', 'writer')
    ordering = ('created_at',)
    fields = ['loan_case', 'writer', 'content', 'is_question', 'parent', 'is_read', 'created_at']

@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ('title', 'priority', 'created_at', 'created_by', 'end_date', 'is_active')
    search_fields = ('title', 'content')
    ordering = ('-priority', '-created_at')
    fields = ['title', 'content', 'priority', 'created_by', 'end_date', 'is_active']  # 'created_at'을 제외