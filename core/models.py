# core/models.py
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import datetime
from django.utils import timezone
from datetime import timedelta

class LoanCase(models.Model):
    """대출 건 메인 모델"""
    STATUS_CHOICES = [
        ('단순조회중', '단순조회중'),
        ('신용조회중', '신용조회중'),
        ('서류수취중', '서류수취중'),
        ('심사중', '심사중'),
        ('승인', '승인'),
        ('자서예정', '자서예정'),
        ('기표예정', '기표예정'),
        ('용도증빙', '용도증빙'),
        ('완료', '완료'),
        ('취소', '취소'),
        ('거절', '거절'),
        ('보류', '보류'),
    ]

    BUSINESS_TYPE_CHOICES = [
        ('일반(실)', '일반(실)'),
        ('일반(가)', '일반(가)'),
        ('간이(실)', '간이(실)'),
        ('간이(가)', '간이(가)'),
        ('면세', '면세'),
        ('법인', '법인'),
    ]

    VAT_STATUS_CHOICES = [
        ('신고함-정상', '신고함-정상'),
        ('신고필요-기한후', '신고필요-기한후'),
        ('신고필요-수정', '신고필요-수정'),
        ('신고필요-대행', '신고필요-대행'),
        ('거절의사', '거절의사'),
    ]

    PRICE_TYPE_CHOICES = [
        ('KB일반가', 'KB일반가'),
        ('KB하한가', 'KB하한가'),
        ('테크가', '테크가'),
        ('탁감가', '탁감가'),
        ('정감가', '정감가'),
    ]

    LOAN_TYPE_CHOICES = [
        ('신규', '신규'),
        ('추가', '추가'),
        ('대환', '대환'),
    ]

    # 기본 정보
    status = models.CharField('진행상황', max_length=20, choices=STATUS_CHOICES, default='단순조회중', null=True, blank=True)
    referrer = models.CharField('레퍼', max_length=50, blank=True, null=True)
    introducer = models.CharField('소개자', max_length=50, blank=True, null=True)  # 신규 소개자 필드
    manager = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='담당자')
    created_at = models.DateTimeField('생성일', auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField('수정일', auto_now=True, null=True, blank=True)
    loan_type = models.CharField('대출 유형', max_length=10, choices=LOAN_TYPE_CHOICES, null=True, blank=True)  # 신규/추가/대환 선택

    # 차주 정보
    borrower_name = models.CharField(max_length=255)
    borrower_birth = models.CharField('차주 생년월일', max_length=6, null=True, blank=True)
    borrower_phone = models.CharField('차주 연락처', max_length=13, null=True, blank=True)
    borrower_credit_score = models.IntegerField('차주 신용점수', null=True, blank=True)

    # # 담보제공자 정보/선설정 정보
    # security_provider_list = models.ManyToManyField('SecurityProvider', related_name='loan_cases', blank=True)
    # prior_loan_list = models.ManyToManyField('PriorLoan', related_name='related_loan_cases', blank=True)

    # 담보물건 정보
    address_main = models.CharField('담보물건지', max_length=200, help_text='동까지', null=True, blank=True)
    address_detail = models.CharField('상세주소', max_length=200, null=True, blank=True)
    area = models.DecimalField('면적', max_digits=10, decimal_places=2, null=True, blank=True)
    
    # 체크박스 필드들
    is_lower_than_2nd = models.BooleanField('2층이하', default=False, null=True, blank=True)
    is_commercial_residential = models.BooleanField('주상복합', default=False, null=True, blank=True)
    is_above_4th_rank = models.BooleanField('4순위이상', default=False, null=True, blank=True)
    has_registration_issue = models.BooleanField('등기이상', default=False, null=True, blank=True)
    is_trading_price_low = models.BooleanField('실거래가열위', default=False, null=True, blank=True)
    is_tenant = models.BooleanField('세입자', default=False, null=True, blank=True)  # 세입자 필드 추가


    # 시세정보
    price_type = models.CharField('시세구분', max_length=20, choices=PRICE_TYPE_CHOICES, null=True, blank=True)
    price_amount = models.IntegerField('시세금액', help_text='단위: 만원', null=True, blank=True)

    # 사업자 정보
    business_type = models.CharField('사업자구분', max_length=10, choices=BUSINESS_TYPE_CHOICES, null=True, blank=True)
    business_number = models.CharField('사업자번호', max_length=20, null=True, blank=True)  # 사업자번호 추가
    business_category = models.CharField('업태', max_length=100, null=True, blank=True)  # 업태 추가
    business_item = models.CharField('종목', max_length=100, null=True, blank=True)  # 종목 추가
    monthly_sales = models.IntegerField('현재매출', help_text='단위: 만원', null=True, blank=True)
    vat_status = models.CharField('부가세 신고 여부', max_length=20, choices=VAT_STATUS_CHOICES, null=True, blank=True)
    other_income = models.CharField('사업자외소득', max_length=200, blank=True, null=True)
    
    # 추가 체크박스
    is_fake_business = models.BooleanField('가라사업자 여부', default=False, null=True, blank=True)
    is_soho = models.BooleanField('소호여부', default=False, null=True, blank=True)
    need_proof_of_use = models.BooleanField('용도증빙필요', default=False, null=True, blank=True)
    is_separate_household = models.BooleanField('별도세대', default=False, null=True, blank=True)
    
    # 거주 및 실행 정보
    residents = models.TextField('거주구성원', blank=True, null=True)
    loan_amount = models.IntegerField('실행금액', help_text='단위: 만원', null=True, blank=True)
    interest_rate = models.DecimalField('실행금리', max_digits=4, decimal_places=2, null=True, blank=True)

    # 긴급처리 관련 필드 추가
    is_urgent = models.BooleanField(default=False)  # 긴급처리 여부
    waiting_for_reference_response = models.BooleanField(default=False)  # 레퍼응답대기중 여부

    #예정일필드
    reception_date = models.DateField('접수일', null=True, blank=True)  # 접수일
    authorizing_date = models.DateField('자서예정일', null=True, blank=True)  # 자서예정일
    journalizing_date = models.DateField('기표예정일', null=True, blank=True)  # 기표예정일
    scheduled_date = models.DateField('고객요청일', null=True, blank=True)  # 고객체크

    # 상태 변경 이력을 저장할 JSON 필드 추가
    status_changes = models.JSONField('상태 변경 이력', default=list, blank=True, null=True)

    def save(self, *args, **kwargs):
        # 상태가 변경되었을 때 이력 저장
        if self.pk:  # 기존 객체 수정시
            try:
                old_obj = LoanCase.objects.get(pk=self.pk)
                if old_obj.status != self.status:  # 상태가 변경되었다면
                    if not isinstance(self.status_changes, list):
                        self.status_changes = []
                    
                    self.status_changes.append({
                        'from_status': old_obj.status,
                        'to_status': self.status,
                        'changed_at': timezone.now().isoformat(),
                        'changed_by': getattr(getattr(self, '_request', None), 'user', None)
                    })
            except LoanCase.DoesNotExist:
                pass
        
        # 긴급처리 여부 체크 및 처리
        if self.is_urgent_schedule:
            self.is_urgent = True
        
        super().save(*args, **kwargs)

    @property
    def is_urgent_schedule(self):
        if self.is_urgent:  # urgent -> is_urgent로 변경
            return True
        
        if not self.scheduled_date:
            return False
        
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        if self.status in ['자서예정', '기표예정']:
            return self.scheduled_date == tomorrow
        
        return False

    def save(self, *args, **kwargs):
        """저장 전 긴급처리 여부 체크 및 처리"""
        if self.is_urgent_schedule:
            self.urgent = True  # 긴급 처리 여부 자동 설정
        
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = '대출건'
        verbose_name_plural = '대출건 목록'

    def __str__(self):
        return f"{self.borrower_name}님의 대출 건"

    @property
    def borrower_age(self):
        """차주의 만 나이 계산"""
        return self._calculate_age(self.borrower_birth)
    
    @property
    def status_display(self):
        # STATUS_CHOICES에서 현재 status에 해당하는 레이블 반환
        return dict(self.STATUS_CHOICES).get(self.status, self.status)

    @property
    def business_type_display(self):
        return dict(self.BUSINESS_TYPE_CHOICES).get(self.business_type, self.business_type)

    @property
    def vat_status_display(self):
        return dict(self.VAT_STATUS_CHOICES).get(self.vat_status, self.vat_status)

    @property
    def loan_type_display(self):
        loan_type_dict = {
            '신규': '신규',
            '추가': '추가',
            '대환': '대환'
        }
        return loan_type_dict.get(self.loan_type, self.loan_type)

    @property
    def loan_rank(self):
        prior_loans = self.prior_loans.all()
        return '후순위' if prior_loans.exists() else '선순위'

    @property
    def loan_ltv(self):
        prior_loans = self.prior_loans.all()
        prior_loan_amount = sum(loan.amount for loan in prior_loans)
        
        loan_amount = self.loan_amount or 0
        total_loan_amount = loan_amount + prior_loan_amount
        
        if self.price_amount:
            return round((total_loan_amount / self.price_amount) * 100, 2)
        return None
    
    @property
    def is_tenant_display(self):
        return 'O' if self.is_tenant else 'X'

    @property
    def is_fake_business_display(self):
        return 'O' if self.is_fake_business else 'X'

    @property
    def is_soho_display(self):
        return 'O' if self.is_soho else 'X'

    @property
    def need_proof_of_use_display(self):
        return 'O' if self.need_proof_of_use else 'X'

    @property
    def is_separate_household_display(self):
        return 'O' if self.is_separate_household else 'X'

    @property
    def prior_loan_details(self):
        prior_loans = self.prior_loans.all()
        return ', '.join([f"{loan.financial_company} {loan.amount}만원" for loan in prior_loans]) if prior_loans else None

    @property
    def consulting_log_summary(self):
        consulting_logs = self.consulting_logs.all()
        return ', '.join([log.content for log in consulting_logs]) if consulting_logs else None

    def _calculate_age(self, birth_date):
        """생년월일로 만 나이 계산"""
        birth_year = int('19' + birth_date[:2] if int(birth_date[:2]) > 23 else '20' + birth_date[:2])
        birth_month = int(birth_date[2:4])
        birth_day = int(birth_date[4:6])
        
        today = datetime.now()
        age = today.year - birth_year
        if (today.month, today.day) < (birth_month, birth_day):
            age -= 1
        return age
    
    def to_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'referrer': self.referrer,
            'introducer': self.introducer,
            'status_display': self.status_display,
            'manager': self.manager.get_full_name() if self.manager else None,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'borrower_name': self.borrower_name,
            'borrower_birth': self.borrower_birth,
            'borrower_phone': self.borrower_phone,
            'borrower_credit_score': self.borrower_credit_score,
            'address_main': self.address_main,
            'address_detail': self.address_detail,
            'area': float(self.area) if self.area else None,
            'price_type': self.price_type,
            'price_amount': self.price_amount,
            'business_type': self.business_type,
            'business_number': self.business_number,
            'business_category': self.business_category,
            'business_item': self.business_item,
            'monthly_sales': self.monthly_sales,
            'vat_status': self.vat_status,
            'other_income': self.other_income,
            'residents': self.residents,
            'loan_amount': self.loan_amount,
            'interest_rate': float(self.interest_rate) if self.interest_rate else None,
            'is_urgent': self.is_urgent,
            'reception_date': self.reception_date,
            'authorizing_date': self.authorizing_date,
            'journalizing_date': self.journalizing_date,
            'scheduled_date': self.scheduled_date,
            # 체크박스 필드 추가
            'is_lower_than_2nd': self.is_lower_than_2nd,
            'is_commercial_residential': self.is_commercial_residential,
            'is_above_4th_rank': self.is_above_4th_rank,
            'has_registration_issue': self.has_registration_issue,
            'is_trading_price_low': self.is_trading_price_low,
            'is_fake_business': self.is_fake_business,
            'is_soho': self.is_soho,
            'need_proof_of_use': self.need_proof_of_use,
            'is_separate_household': self.is_separate_household,
            'is_tenant': self.is_tenant,
            # 추가 필드
            'is_lower_than_2nd': self.is_lower_than_2nd,
            'is_commercial_residential': self.is_commercial_residential,
            'is_above_4th_rank': self.is_above_4th_rank,
            'has_registration_issue': self.has_registration_issue,
            'is_trading_price_low': self.is_trading_price_low,
            'is_fake_business': self.is_fake_business,
            'is_fake_business_display': self.is_fake_business_display,
            'is_soho': self.is_soho,
            'is_soho_display': self.is_soho_display,
            'need_proof_of_use': self.need_proof_of_use,
            'need_proof_of_use_display': self.need_proof_of_use_display,
            'is_separate_household': self.is_separate_household,
            'is_separate_household_display': self.is_separate_household_display,
            'is_tenant': self.is_tenant,
            'is_tenant_display': self.is_tenant_display,
        }
    
    
    

class ConsultingLog(models.Model):
    """상담일지 모델"""
    loan_case = models.ForeignKey(LoanCase, on_delete=models.CASCADE, related_name='consulting_logs', null=True, blank=True)
    content = models.TextField('상담내용', null=True, blank=True)
    created_at = models.DateTimeField('작성일시', auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField('수정일시', auto_now=True, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consulting_logs'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'created_by': self.created_by.get_full_name() if self.created_by else 'Unknown',
        }

    class Meta:
        ordering = ['-created_at']

class Notice(models.Model):
    """공지사항 모델"""
    PRIORITY_CHOICES = [
        ('높음', '높음'),
        ('중간', '중간'),
        ('낮음', '낮음'),
    ]

    title = models.CharField('제목', max_length=200, null=True, blank=True)
    content = models.TextField('내용', null=True, blank=True)
    priority = models.CharField('중요도', max_length=10, choices=PRIORITY_CHOICES, default='중간', null=True, blank=True)
    created_at = models.DateTimeField('작성일', auto_now_add=True, null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    end_date = models.DateField('게시 종료일', null=True, blank=True)
    is_active = models.BooleanField('활성화', default=True, null=True, blank=True)

    class Meta:
        ordering = ['-priority', '-created_at']
        verbose_name = '공지사항'
        verbose_name_plural = '공지사항 목록'

class CaseComment(models.Model):
    """대출건별 커뮤니케이션"""
    loan_case = models.ForeignKey(LoanCase, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    writer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        verbose_name='작성자'
    )
    content = models.TextField('내용', null=True, blank=True)
    created_at = models.DateTimeField('작성일시', auto_now_add=True, null=True, blank=True)
    is_question = models.BooleanField('관리자 질문여부', default=False, null=True, blank=True)
    parent = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='replies',
        verbose_name='상위 댓글'
    )
    is_read = models.BooleanField('읽음여부', default=False, null=True, blank=True)

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'writer_name': self.writer.get_full_name() if self.writer else 'Unknown',
            'is_question': self.is_question,
            'is_read': self.is_read,
            'parent_id': self.parent_id if self.parent else None,
        }

    class Meta:
        ordering = ['created_at']
        verbose_name = '케이스 댓글'
        verbose_name_plural = '케이스 댓글 목록'

    def __str__(self):
        return f"{self.loan_case.borrower_name}의 건에 대한 {'질문' if self.is_question else '답변'}"
    
class SecurityProvider(models.Model):
    """담보제공자 정보"""
    loan_case = models.ForeignKey(
        LoanCase,
        on_delete=models.CASCADE,
        related_name='security_providers',
        verbose_name='대출 건'
    )
    name = models.CharField('이름', max_length=50)
    birth_date = models.CharField('생년월일', max_length=6, null=True, blank=True)
    phone = models.CharField('연락처', max_length=13, null=True, blank=True)
    credit_score = models.IntegerField('신용점수', null=True, blank=True)

    # 추가된 관계 필드
    related_person = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        related_name='related_to', 
        null=True, 
        blank=True,
        verbose_name='연관된 제공자'
    )
    relationship_type = models.CharField(
        '관계 유형', 
        max_length=20, 
        choices=[
            ('spouse', '배우자'),
            ('parent', '부모님'),
            ('sibling', '형제/자매'),
            ('child', '자녀'),
            ('other', '기타'),
        ],
        null=True,
        blank=True
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'birth_date': self.birth_date,
            'phone': self.phone,
            'credit_score': self.credit_score,
            'relationship_type': self.relationship_type,
            'related_person_id': self.related_person.id if self.related_person else None
        }

    class Meta:
        verbose_name = '담보제공자'
        verbose_name_plural = '담보제공자 목록'

    def __str__(self):
        return self.name

class PriorLoan(models.Model):
    """선설정/대환 대출 정보"""
    loan_case = models.ForeignKey(
        LoanCase,
        on_delete=models.CASCADE,
        related_name='prior_loans',
        verbose_name='대출 건'
    )
    loan_type = models.CharField('구분', max_length=10, choices=[('선설정', '선설정'), ('대환', '대환')])
    financial_company = models.CharField('금융사', max_length=50)
    amount = models.IntegerField('금액', help_text='단위: 만원')

    def to_dict(self):
        return {
            'id': self.id,
            'loan_type': self.loan_type,
            'financial_company': self.financial_company,
            'amount': self.amount,
            'formatted_amount': f"{self.amount:,}만원"  # 금액 포맷팅 추가
        }

    class Meta:
        verbose_name = '선설정/대환 대출'
        verbose_name_plural = '선설정/대환 대출 목록'

    def __str__(self):
        return f"{self.loan_type} - {self.financial_company} - {self.amount}만원"
    

class Event(models.Model):
    EVENT_TYPES = [
        ('scheduled', '접수'),
        ('authorizing', '자서'),
        ('journalizing', '기표'),
    ]
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='scheduled')  # default 추가
    date = models.DateField(null=True, blank=True)  # null=True, blank=True 추가
    loan_case = models.ForeignKey(LoanCase, related_name='events', on_delete=models.CASCADE)

    def save(self, *args, **kwargs):
        # date가 없는 경우에만 기본값 설정
        if not self.date:
            if self.event_type == 'authorizing' and self.loan_case.authorizing_date:
                self.date = self.loan_case.authorizing_date
            elif self.event_type == 'journalizing' and self.loan_case.journalizing_date:
                self.date = self.loan_case.journalizing_date
            elif self.event_type == 'scheduled' and self.loan_case.scheduled_date:
                self.date = self.loan_case.scheduled_date
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_event_type_display()} - {self.title}"