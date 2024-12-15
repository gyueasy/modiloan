from typing import List, Dict, Optional
from django.db.models import Count, Sum, Q
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from datetime import date, timedelta
from ..models import LoanCase, Notice, CaseComment, Event
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class DashboardService:
    @staticmethod
    def get_dashboard_data(user) -> Dict:
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)

        data = {
            'today_stats': DashboardService._get_today_stats(today, yesterday),
            'month_stats': DashboardService._get_month_stats(),
            'urgent_cases': DashboardService._get_urgent_cases(today),
            'recent_cases': DashboardService._get_recent_cases(user),
            'unread_questions': DashboardService._get_unread_questions(user),
            'notices': DashboardService._get_active_notices(today),
        }
        return data

    @staticmethod
    def _get_today_stats(today: date, yesterday: date) -> Dict:
        # 상태 그룹 정의
        ONGOING_STATUSES = ['단순조회중', '신용조회중', '서류수취중', '심사중', '승인', '자서예정', '기표예정']
        COMPLETED_STATUSES = ['용도증빙', '완료']

        # 신규 케이스
        new_cases_today = LoanCase.objects.filter(created_at__date=today).count()
        new_cases_yesterday = LoanCase.objects.filter(created_at__date=yesterday).count()

        # 진행중 케이스 (정의된 상태들만)
        ongoing_cases_today = LoanCase.objects.filter(status__in=ONGOING_STATUSES).count()
        ongoing_cases_yesterday = LoanCase.objects.filter(
            created_at__date__lte=yesterday,
            status__in=ONGOING_STATUSES
        ).count()

        # 완료 케이스 (30일 이내)
        thirty_days_ago = today - timedelta(days=30)
        completed_cases_today = LoanCase.objects.filter(
            status__in=COMPLETED_STATUSES,
            created_at__date__gte=thirty_days_ago
        ).count()
        completed_cases_yesterday = LoanCase.objects.filter(
            status__in=COMPLETED_STATUSES,
            created_at__date__gte=thirty_days_ago - timedelta(days=1),
            created_at__date__lt=today
        ).count()

        return {
            'new_cases': new_cases_today,
            'new_cases_diff': new_cases_today - new_cases_yesterday,
            'ongoing_cases': ongoing_cases_today,
            'ongoing_cases_diff': ongoing_cases_today - ongoing_cases_yesterday,
            'completed_cases': completed_cases_today,
            'completed_cases_diff': completed_cases_today - completed_cases_yesterday,
        }

    @staticmethod
    def _get_month_stats() -> Dict:
        today = timezone.now().date()
        first_day_of_month = today.replace(day=1)
        last_month = first_day_of_month - timedelta(days=1)
        first_day_of_last_month = last_month.replace(day=1)

        this_month_stats = LoanCase.objects.filter(created_at__gte=first_day_of_month, status='완료').aggregate(
            count=Count('id'),
            amount=Sum('loan_amount')
        )
        last_month_stats = LoanCase.objects.filter(
            created_at__gte=first_day_of_last_month,
            created_at__lt=first_day_of_month,
            status='완료'
        ).aggregate(
            count=Count('id'),
            amount=Sum('loan_amount')
        )

        return {
            'count': this_month_stats['count'] or 0,
            'count_diff': (this_month_stats['count'] or 0) - (last_month_stats['count'] or 0),
            'amount': this_month_stats['amount'] or 0,
            'amount_diff': (this_month_stats['amount'] or 0) - (last_month_stats['amount'] or 0)
        }

    @staticmethod
    def _get_urgent_cases(today: date) -> List[Dict]:
        cases = LoanCase.objects.filter(
            Q(is_urgent=True) |
            Q(status='자서예정', scheduled_date=today + timedelta(days=1)) |
            Q(status='기표예정', scheduled_date=today + timedelta(days=1))
        ).select_related('manager')

        return [case.to_dict() for case in cases]

    @staticmethod
    def _get_recent_cases(user) -> List[Dict]:
        cases = LoanCase.objects.filter(manager=user).select_related('manager').order_by('-created_at')[:5]
        return [case.to_dict() for case in cases]

    @staticmethod
    def _get_unread_questions(user) -> List[Dict]:
        questions = CaseComment.objects.filter(
            loan_case__manager=user,
            is_question=True,
            is_read=False
        ).select_related('loan_case')

        return [question.to_dict() for question in questions]

    @staticmethod
    def _get_active_notices(today: date) -> List[Dict]:
        notices = Notice.objects.filter(
            Q(end_date__gte=today) | Q(end_date__isnull=True),
            is_active=True
        ).select_related('created_by')

        return [
            {
                'id': notice.id,
                'title': notice.title,
                'content': notice.content,
                'priority': notice.priority,
                'created_at': notice.created_at.isoformat(),
                'created_by': notice.created_by.get_full_name() if notice.created_by else None,
                'end_date': notice.end_date.isoformat() if notice.end_date else None,
                'is_active': notice.is_active
            }
            for notice in notices
        ]

    @staticmethod
    def get_calendar_events(start_str, end_str):
        # 날짜 파라미터가 있을 경우, 이를 datetime 객체로 변환
        start_date = datetime.fromisoformat(start_str) if start_str else None
        end_date = datetime.fromisoformat(end_str) if end_str else None
        
        events = []

        for event in Event.objects.all():
            # 필터링된 날짜 범위에 맞는 이벤트만 추가
            if start_date and event.date < start_date:
                continue
            if end_date and event.date > end_date:
                continue

            if event.authorizing_date:
                events.append({
                    'title': f"{event.title} - 자서예정일",
                    'date': event.authorizing_date,
                    'description': event.description or '',
                })
            if event.journalizing_date:
                events.append({
                    'title': f"{event.title} - 기표예정일",
                    'date': event.journalizing_date,
                    'description': event.description or '',
                })
            if event.scheduled_date:
                events.append({
                    'title': f"{event.title} - 고객요청일",
                    'date': event.scheduled_date,
                    'description': event.description or '',
                })
        return events