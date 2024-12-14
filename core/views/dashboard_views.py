
# core/views/dashboard_views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from accounts.permissions import CanManageCase
from ..services.dashboard_service import DashboardService
from core.views.event_views import EventListView  # 절대경로로 수정
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Fallback: 직접 작성한 format_error_response
def format_error_response(message: str) -> dict:
    return {"error": {"message": message}}

@api_view(['GET'])
@permission_classes([CanManageCase])
def dashboard_view(request):
    try:
        # dashboard_data에서 calendar_events를 포함하지 않도록 수정
        dashboard_data = DashboardService.get_dashboard_data(request.user)
        
        # calendar_events를 삭제하거나 추가하지 않음
        return Response(dashboard_data, status=status.HTTP_200_OK)
    except Exception as e:
        error_message = f"Failed to fetch dashboard data: {str(e)}"
        return Response(format_error_response(error_message), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
