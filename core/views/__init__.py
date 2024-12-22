from .case_views import (
    case_detail_view, case_status_view, case_schedule_view, 
    case_urgent_view, case_update_view, update_loan_info_view,
    update_collateral_info_view, update_business_info_view,
    case_create_view, case_delete_view
)
from .dashboard_views import dashboard_view
from .case_list_views import LoanCaseListView
from .case_list_views import case_list_view, case_add_view
from .provider_views import provider_list_view, provider_detail_view
from .prior_loan_views import prior_loan_list_view, prior_loan_detail_view
from .consulting_views import consulting_log_view, consulting_log_detail_view
from .comment_views import comment_view, comment_detail_view, mark_comments_as_read
from .event_views import EventListView
from .csv_management_views import export_cases_to_csv, import_cases_from_csv

# core/views/__init__.py
# 기존 코드
# from .dashboard_views import dashboard_view

# 수정된 코드: 필요할 때만 임포트
# 예를 들어, dashboard_views를 사용할 때 임포트

def get_dashboard_view():
    from .dashboard_views import dashboard_view
    return dashboard_view