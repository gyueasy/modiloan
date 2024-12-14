# core/views/consulting_views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from ..services.loan_case_service import LoanCaseService
from accounts.permissions import CanManageCase
import logging

logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
@permission_classes([CanManageCase])
def consulting_log_view(request, case_id):
    try:
        loan_case = LoanCaseService.get_case_with_related(case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            consulting_logs = loan_case.consulting_logs.all()
            return Response({
                'consulting_logs': [log.to_dict() for log in consulting_logs]
            })

        content = request.data.get('content')
        if not content:
            return Response({'error': '상담 내용을 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)

        consulting_log = LoanCaseService.add_consulting_log(
            case_id, content, request.user)
        return Response({
            'message': '상담일지가 추가되었습니다.',
            'consulting_log': consulting_log.to_dict()
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error(f"Error in consulting_log_view: {str(e)}", exc_info=True)
        return Response({'error': '서버 오류가 발생했습니다.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([CanManageCase])
def consulting_log_detail_view(request, case_id, log_id):
    try:
        loan_case = LoanCaseService.get_case_with_related(case_id)
        if not loan_case:
            return Response({'error': '대출 건을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        
        # 권한 확인
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
        
        # 상담일지 가져오기
        consulting_log = loan_case.consulting_logs.filter(id=log_id).first()
        if not consulting_log:
            return Response({'error': '상담일지를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        
        # 삭제
        consulting_log.delete()
        
        return Response({'message': '상담일지가 삭제되었습니다.'}, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error in consulting_log_detail_view: {str(e)}", exc_info=True)
        return Response({'error': '서버 오류가 발생했습니다.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
