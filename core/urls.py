from django.urls import path
from . import views
from .views.dashboard_views import dashboard_view
from core.views.event_views import EventListCreateAPIView, EventDetailAPIView, EventListView, CaseEventListView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import case_create_api_view, case_delete_view
app_name = 'core'

urlpatterns = [
    path('', dashboard_view, name='dashboard'),

    #Calendar-events
    path('events/create/', EventListCreateAPIView.as_view(), name='event-list-create'),
    path('events/<int:pk>/', EventDetailAPIView.as_view(), name='event-detail'),
    path('events/', EventListView.as_view(), name='event-list'),
    path('cases/<int:case_id>/events/', CaseEventListView.as_view(), name='case-events'),


    
    # LoanCase
    path('cases/', views.LoanCaseListView.as_view(), name='case_list'),
    path('cases/<int:case_id>/', views.case_detail_view, name='case_detail'),
    path('cases/create/', case_create_api_view, name='case_create_api'),
    path('cases/<int:case_id>/update/', views.case_update_view, name='case_update'),
    path('cases/<int:case_id>/status/', views.case_status_view, name='case_status'),
    path('cases/<int:case_id>/schedule/', views.case_schedule_view, name='case_schedule'),
    path('cases/<int:case_id>/urgent/', views.case_urgent_view, name='case_urgent'),
    path('cases/<int:case_id>/loan-info/', views.update_loan_info_view, name='update_loan_info'),
    path('cases/<int:case_id>/collateral-info/', views.update_collateral_info_view, name='update_collateral_info'),
    path('cases/<int:case_id>/business-info/', views.update_business_info_view, name='update_business_info'),
    path('cases/<int:case_id>/delete/', case_delete_view, name='case_delete_api'),
    
    # SecurityProvider
    path('cases/<int:case_id>/providers/', views.provider_list_view, name='provider_list'),
    path('cases/<int:case_id>/providers/<int:provider_id>/', views.provider_detail_view, name='provider_detail'),
    
    # PriorLoan
    path('cases/<int:case_id>/prior-loans/', views.prior_loan_list_view, name='prior_loan_list'),
    path('cases/<int:case_id>/prior-loans/<int:loan_id>/', views.prior_loan_detail_view, name='prior_loan_detail'),
    
    # ConsultingLog
    path('cases/<int:case_id>/consulting-logs/', views.consulting_log_view, name='consulting_log_list'),
    path('cases/<int:case_id>/consulting-logs/<int:log_id>/', views.consulting_log_detail_view, name='consulting_log_detail'),
    
    # Comments
    path('cases/<int:case_id>/comments/', views.comment_view, name='comment_list'),
    path('cases/<int:case_id>/comments/<int:comment_id>/', views.comment_detail_view, name='comment_detail'),
    path('cases/<int:case_id>/comments/mark-read/', views.mark_comments_as_read, name='mark_comments_read'),
]

# CopyDashboard:
# GET / - 대시보드 조회

# 대출 건:
# GET /cases/ - 대출 건 리스트 조회
# GET /cases/{case_id}/ - 대출 건 상세 조회
# PUT /cases/{case_id}/update/ - 대출 건 정보 수정
# PATCH /cases/{case_id}/status/ - 상태 변경
# PATCH /cases/{case_id}/urgent/ - 긴급처리 설정
# POST /cases/{case_id}/loan-info/ - 대출 정보 업데이트
# POST /cases/{case_id}/collateral-info/ - 담보 정보 업데이트
# POST /cases/{case_id}/business-info/ - 사업자 정보 업데이트

# 담보제공자:
# GET, POST /cases/{case_id}/providers/ - 담보제공자 목록 조회 및 추가
# GET, PUT, DELETE /cases/{case_id}/providers/{provider_id}/ - 담보제공자 조회/수정/삭제

# 선순위대출:
# GET, POST /cases/{case_id}/prior-loans/ - 선순위대출 목록 조회 및 추가
# GET, PUT, DELETE /cases/{case_id}/prior-loans/{loan_id}/ - 선순위대출 조회/수정/삭제

# 상담일지:
# GET, POST /cases/{case_id}/consulting-logs/ - 상담일지 목록 조회 및 추가
# DELETE /cases/{case_id}/consulting-logs/{log_id}/ - 상담일지 삭제

# 댓글:
# GET, POST /cases/{case_id}/comments/ - 댓글 목록 조회 및 추가
# DELETE /cases/{case_id}/comments/{comment_id}/ - 댓글 삭제
# POST /cases/{case_id}/comments/mark-read/ - 댓글 읽음 처리

    # STATUS_CHOICES = [
    #     ('단순조회중', '단순조회중'),
    #     ('신용조회중', '신용조회중'),
    #     ('서류수취중', '서류수취중'),
    #     ('심사중', '심사중'),
    #     ('승인', '승인'),
    #     ('자서예정', '자서예정'),
    #     ('기표예정', '기표예정'),
    #     ('용도증빙', '용도증빙'),
    #     ('완료', '완료'),
    # ]