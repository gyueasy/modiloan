# core/web_urls.py
from django.urls import path
from django.views.generic import TemplateView
from core.views import case_list_view
from core.views import case_add_view

urlpatterns = [
    # 인증
    path('login/', TemplateView.as_view(template_name='accounts/login.html'), name='login'),

    # 대시보드
    path('', (TemplateView.as_view(
        template_name='core/dashboard.html')), name='dashboard'),
    path('dashboard/', (TemplateView.as_view(
        template_name='core/dashboard.html')), name='dashboard'),

    # 대출 케이스 관련
    path('cases/', case_list_view, name='case_list'),

    path('cases/<int:case_id>/',
        (TemplateView.as_view(
            template_name='core/case_detail.html')),
        name='case_detail'),
    path('cases/add/', case_add_view, name='case_add'),

    # 대출 관련 모달 템플릿들
    path('cases/<int:case_id>/modals/provider/',
        (TemplateView.as_view(
            template_name='core/case_detail/_modals/provider_modal.html')),
        name='provider_modal'),
    path('cases/<int:case_id>/modals/prior-loan/',
        (TemplateView.as_view(
            template_name='core/case_detail/_modals/prior_loan_modal.html')),
        name='prior_loan_modal'),

    # 대출 관련 부분 템플릿들
    path('cases/<int:case_id>/parts/form/',
        (TemplateView.as_view(
            template_name='core/case_detail/_form.html')),
        name='case_form'),
    path('cases/<int:case_id>/parts/consulting/',
        (TemplateView.as_view(
            template_name='core/case_detail/_consulting.html')),
        name='case_consulting'),
    path('cases/<int:case_id>/parts/communication/',
        (TemplateView.as_view(
            template_name='core/case_detail/_communication.html')),
        name='case_communication'),

    # 프로필
    path('profile/',
        (TemplateView.as_view(
            template_name='accounts/profile.html')),
        name='profile'),
]
