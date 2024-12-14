from datetime import datetime, timedelta
from django.utils import timezone
from ..services.prior_loan_service import PriorLoanService

def format_stats_diff(current, previous):
    """통계 비교값 포맷팅"""
    if current == previous:
        return ('-', 'neutral')
    diff = current - previous
    if diff > 0:
        return (f'+{diff}', 'increase')
    return (f'{diff}', 'decrease')

def get_date_range():
    """오늘, 이번 달 시작일, 다음 달 시작일 계산. 주말과 금요일 비교 처리."""
    today = timezone.now().date()
    this_month_start = today.replace(day=1)
    next_month_start = (this_month_start + timedelta(days=32)).replace(day=1)

    # 오늘이 월요일이라면 전일은 금요일로 처리
    weekday = today.weekday()
    if weekday == 0:  # 월요일
        yesterday = today - timedelta(days=3)  # 금요일
    else:
        yesterday = today - timedelta(days=1)

    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
    last_month_end = this_month_start - timedelta(days=1)

    return today, this_month_start, next_month_start, yesterday, last_month_start, last_month_end

def format_birth_date(birth_date):
    """생년월일 포맷팅 (예: 901231 -> 90년 12월 31일)"""
    if not birth_date or len(birth_date) != 6:
        return ''
    
    try:
        return f"{birth_date[:2]}년 {birth_date[2:4]}월 {birth_date[4:6]}일"
    except:
        return birth_date

def format_phone_number(phone):
    """전화번호 포맷팅 (예: 01012345678 -> 010-1234-5678)"""
    if not phone:
        return ''
    
    phone = ''.join(filter(str.isdigit, phone))
    
    if len(phone) == 11:
        return f"{phone[:3]}-{phone[3:7]}-{phone[7:]}"
    elif len(phone) == 10:
        return f"{phone[:3]}-{phone[3:6]}-{phone[6:]}"
    return phone

def format_amount(amount):
    """금액 포맷팅 (단위: 만원)"""
    if not amount:
        return '0'
    
    try:
        amount = int(amount)
        if amount >= 10000:
            억 = amount // 10000
            만 = amount % 10000
            if 만 > 0:
                return f"{억}억 {만}만원"
            return f"{억}억원"
        return f"{amount}만원"
    except:
        return str(amount)

def format_percentage(value):
    """비율 포맷팅"""
    if not value:
        return '0%'
    
    try:
        return f"{float(value):.1f}%"
    except:
        return str(value)
    
def format_comment_data(comment):
    """댓글 데이터 포맷팅"""
    return {
        'id': comment.id,
        'content': comment.content,
        'writer_name': comment.writer.get_full_name() if comment.writer else '알 수 없음',
        'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M'),
        'is_question': comment.is_question,
        'parent_id': comment.parent_id
    }

def format_provider_data(provider):
    """담보제공자 데이터 포맷팅"""
    return {
        'id': provider.id,
        'name': provider.name,
        'birth_date': provider.birth_date,
        'phone': provider.phone,
        'credit_score': provider.credit_score,
        'relationship_type': provider.relationship_type,
        'related_person': provider.related_person_id
    }


def format_prior_loan_data(loan):
    """선설정/대환 데이터 포맷팅"""
    return {
        'id': loan.id,
        'loan_type': loan.loan_type,
        'financial_company': loan.financial_company,
        'amount': loan.amount,
        'formatted_amount': PriorLoanService.format_amount(loan.amount)
    }

def format_consulting_log(log):
    """상담일지 데이터 포맷팅"""
    return {
        'id': log.id,
        'content': log.content,
        'created_at': log.created_at.strftime('%Y-%m-%d %H:%M'),
        'created_by': log.created_by.get_full_name() if log.created_by else '알 수 없음'
    }

