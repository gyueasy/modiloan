# core/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.exceptions import ValidationError
from django.views.decorators.http import require_http_methods
from django.db import transaction
from django.db.models import Count, Sum, Q, Case, When, Value, CharField
from django.core.serializers.json import DjangoJSONEncoder
from django.urls import reverse
from django.utils import timezone
from datetime import datetime, timedelta
import json

from .models import (
    LoanCase,
    Notice, 
    CaseComment, 
    ConsultingLog, 
    SecurityProvider, 
    PriorLoan
)
from .utils.formatters import get_date_range, format_stats_diff
from .services.security_provider_service import SecurityProviderService
from .services.loan_case_service import LoanCaseService
from .services.prior_loan_service import PriorLoanService


def prepare_case_detail_context(loan_case):
    """대출 건 상세 페이지의 컨텍스트 준비"""
    return {
        'loan_case': loan_case,
        'security_providers': loan_case.security_providers.all(),
        'prior_loans': loan_case.prior_loans.all(),
        'total_prior_loan_amount': PriorLoanService.get_total_amount(loan_case.id),
        'comments': loan_case.comments.all().order_by('created_at'),
        'consulting_logs': loan_case.consulting_logs.all(),
        'status_choices': loan_case.STATUS_CHOICES,
        'business_type_choices': loan_case.BUSINESS_TYPE_CHOICES,
        'vat_status_choices': loan_case.VAT_STATUS_CHOICES,
        'price_type_choices': loan_case.PRICE_TYPE_CHOICES,
    }


def format_comment_data(comment):
    """댓글 데이터 포맷팅"""
    return {
        'id': comment.id,
        'content': comment.content,
        'writer_name': comment.writer.get_full_name() if comment.writer else '알 수 없음',
        'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M'),
        'is_question': comment.is_question
    }


@login_required
@require_http_methods(["GET", "POST"])
def case_detail_view(request, case_id):
    """대출 건 상세 정보 뷰"""
    try:
        # GET 요청 처리
        if request.method == "GET":
            loan_case = LoanCaseService.get_case_with_related(case_id)

            # 읽지 않은 댓글 읽음 처리
            LoanCaseService.mark_comments_as_read(case_id, request.user)

            context = prepare_case_detail_context(loan_case)
            return render(request, 'core/case_detail.html', context)

        # POST 요청 처리
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        action = request.POST.get('action')

        try:
            response_data = handle_case_action(request, case_id, action)

            if is_ajax:
                return JsonResponse(response_data)

            messages.success(request, response_data.get('message', '처리되었습니다.'))
            return redirect('core:case_detail', case_id=case_id)

        except ValidationError as e:
            if is_ajax:
                return JsonResponse({'success': False, 'message': str(e)}, status=400)
            messages.error(request, str(e))
            return redirect('core:case_detail', case_id=case_id)

    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
        messages.error(request, f'오류가 발생했습니다: {str(e)}')
        return redirect('core:case_list')


@transaction.atomic
def handle_case_action(request, case_id, action):
    """대출 건 관련 액션 처리"""
    if action == 'security_provider':
        return handle_security_provider_action(request, case_id)
    elif action == 'prior_loan':
        return handle_prior_loan_action(request, case_id)
    elif action == 'update_case':
        LoanCaseService.update_case_info(case_id, request.POST)
        return {'success': True, 'message': '정보가 업데이트되었습니다.'}
    elif action == 'add_consulting':
        consulting_log = LoanCaseService.add_consulting_log(
            case_id,
            request.POST.get('consulting_content'),
            request.user
        )
        return {'success': True, 'message': '상담일지가 추가되었습니다.'}
    elif action == 'update_status':
        LoanCaseService.update_case_status(case_id, request.POST.get('status'))
        return {'success': True, 'message': '상태가 변경되었습니다.'}
    elif action == 'set_schedule':
        success, error = LoanCaseService.set_schedule_date(
            case_id,
            datetime.strptime(request.POST.get(
                'scheduled_date'), '%Y-%m-%d').date()
        )
        if not success:
            raise ValidationError(error)
        return {'success': True, 'message': '예정일이 설정되었습니다.'}
    elif action == 'toggle_urgent':
        is_urgent = LoanCaseService.toggle_urgent_status(case_id)
        return {
            'success': True,
            'message': f'긴급처리 상태가 {"설정" if is_urgent else "해제"}되었습니다.'
        }
    elif action == 'add_comment':
        comment = LoanCaseService.add_comment(
            case_id,
            request.POST.get('content'),
            request.user
        )
        return {
            'success': True,
            'message': '댓글이 등록되었습니다.',
            'comment': format_comment_data(comment)
        }
    else:
        raise ValidationError('잘못된 액션입니다.')


def handle_security_provider_action(request, case_id):
    """담보제공자 관련 액션 처리"""
    provider_action = request.POST.get('provider_action')
    provider_data = {
        'name': request.POST.get('provider_name'),
        'birth_date': request.POST.get('provider_birth_date'),
        'phone': request.POST.get('provider_phone'),
        'credit_score': request.POST.get('provider_credit_score')
    }

    if provider_action == 'add':
        provider = SecurityProviderService.create_provider(
            case_id, provider_data)
        return {'success': True, 'message': '담보제공자가 추가되었습니다.'}
    elif provider_action == 'update':
        provider = SecurityProviderService.update_provider(
            request.POST.get('provider_id'),
            provider_data
        )
        return {'success': True, 'message': '담보제공자 정보가 수정되었습니다.'}
    elif provider_action == 'delete':
        SecurityProviderService.delete_provider(
            case_id, request.POST.get('provider_id'))
        return {'success': True, 'message': '담보제공자가 제거되었습니다.'}
    else:
        raise ValidationError('잘못된 provider_action입니다.')


def handle_prior_loan_action(request, case_id):
    """선설정/대환 관련 액션 처리"""
    loan_action = request.POST.get('loan_action')
    loan_data = {
        'loan_type': request.POST.get('loan_type'),
        'financial_company': request.POST.get('financial_company'),
        'amount': request.POST.get('amount')
    }

    if loan_action == 'add':
        prior_loan = PriorLoanService.create_prior_loan(case_id, loan_data)
        return {'success': True, 'message': '선설정/대환이 추가되었습니다.'}
    elif loan_action == 'update':
        prior_loan = PriorLoanService.update_prior_loan(
            request.POST.get('prior_loan_id'),
            loan_data
        )
        return {'success': True, 'message': '선설정/대환 정보가 수정되었습니다.'}
    elif loan_action == 'delete':
        PriorLoanService.delete_prior_loan(
            case_id, request.POST.get('prior_loan_id'))
        return {'success': True, 'message': '선설정/대환이 제거되었습니다.'}
    else:
        raise ValidationError('잘못된 loan_action입니다.')

# core/views.py의 dashboard_view 부분을 개선하겠습니다


@login_required
@require_http_methods(["GET"])
def dashboard_view(request):
    """대시보드 뷰"""
    try:
        today, this_month_start, next_month_start, yesterday, last_month_start, last_month_end = get_date_range()

        context = {
            'today_stats': get_today_stats(today, yesterday),
            'month_stats': get_month_stats(this_month_start, last_month_start, last_month_end),
            'urgent_cases': get_urgent_cases(today),
            'unread_questions': get_unread_questions(request.user),
            'notices': get_active_notices(today),
            'recent_cases': get_recent_cases(request.user),
            'calendar_events': get_calendar_events(today, next_month_start)
        }

        return render(request, 'core/dashboard.html', context)

    except Exception as e:
        messages.error(request, f'대시보드 로딩 중 오류가 발생했습니다: {str(e)}')
        return redirect('core:case_list')


def get_today_stats(today, yesterday):
    """오늘의 통계 데이터 조회"""
    # 오늘 신규 대출 건수
    new_cases_today = LoanCase.objects.filter(created_at__date=today).count()
    new_cases_yesterday = LoanCase.objects.filter(
        created_at__date=yesterday).count()
    new_cases_diff, new_trend = format_stats_diff(
        new_cases_today, new_cases_yesterday)

    # 진행중 대출 건수
    ongoing_cases_today = LoanCase.objects.exclude(status='완료').count()
    ongoing_cases_yesterday = LoanCase.objects.filter(
        created_at__date__lte=yesterday
    ).exclude(status='완료').count()
    ongoing_cases_diff, ongoing_trend = format_stats_diff(
        ongoing_cases_today, ongoing_cases_yesterday)

    return {
        'new_cases': new_cases_today,
        'new_cases_diff': new_cases_diff,
        'new_trend': new_trend,
        'ongoing_cases': ongoing_cases_today,
        'ongoing_cases_diff': ongoing_cases_diff,
        'ongoing_trend': ongoing_trend,
    }


def get_month_stats(this_month_start, last_month_start, last_month_end):
    """이번 달 실적 통계 조회"""
    month_stats = LoanCase.objects.filter(
        status='완료'
    ).aggregate(
        current_count=Count('id', filter=Q(
            created_at__date__gte=this_month_start)),
        current_amount=Sum('loan_amount', filter=Q(
            created_at__date__gte=this_month_start)),
        last_count=Count('id', filter=Q(
            created_at__date__gte=last_month_start,
            created_at__date__lte=last_month_end
        )),
        last_amount=Sum('loan_amount', filter=Q(
            created_at__date__gte=last_month_start,
            created_at__date__lte=last_month_end
        ))
    )

    month_count_diff, month_count_trend = format_stats_diff(
        month_stats['current_count'] or 0,
        month_stats['last_count'] or 0
    )
    month_amount_diff, month_amount_trend = format_stats_diff(
        month_stats['current_amount'] or 0,
        month_stats['last_amount'] or 0
    )

    return {
        'count': month_stats['current_count'] or 0,
        'count_diff': month_count_diff,
        'count_trend': month_count_trend,
        'amount': month_stats['current_amount'] or 0,
        'amount_diff': month_amount_diff,
        'amount_trend': month_amount_trend,
    }


def get_urgent_cases(today):
    """긴급처리 필요 건 조회"""
    return LoanCase.objects.filter(
        Q(is_urgent=True) |
        Q(status='자서예정', scheduled_date=today + timedelta(days=1)) |
        Q(status='기표예정', scheduled_date=today + timedelta(days=1))
    ).select_related('manager').distinct()


def get_unread_questions(user):
    """읽지 않은 질문 조회"""
    return CaseComment.objects.filter(
        loan_case__manager=user,
        is_question=True,
        is_read=False
    ).select_related('loan_case')


def get_active_notices(today):
    """활성화된 공지사항 조회"""
    return Notice.objects.filter(
        Q(end_date__gte=today) | Q(end_date__isnull=True),
        is_active=True
    ).select_related('created_by')


def get_recent_cases(user):
    """최근 배정된 케이스 조회"""
    return LoanCase.objects.filter(
        manager=user
    ).select_related('manager').order_by('-created_at')[:5]


def get_calendar_events(today, next_month_start):
    """캘린더 이벤트 데이터 조회"""
    scheduled_cases = LoanCase.objects.filter(
        scheduled_date__range=[today, next_month_start],
        status__in=['자서예정', '기표예정']
    ).order_by('scheduled_date').annotate(
        event_color=Case(
            When(status='자서예정', then=Value('#3B82F6')),
            When(status='기표예정', then=Value('#10B981')),
            default=Value('#64748B'),
            output_field=CharField(),
        )
    )

    return json.dumps([{
        'title': f"{case.borrower_name} {case.get_status_display()}",
        'start': case.scheduled_date.strftime('%Y-%m-%d'),
        'backgroundColor': case.event_color,
        'borderColor': case.event_color,
        'url': reverse('core:case_detail', args=[case.id]),
        'className': 'cursor-pointer hover:opacity-90'
    } for case in scheduled_cases], cls=DjangoJSONEncoder)
