# core/views/case_views.py

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from ..models import LoanCase
from ..services.loan_case_service import LoanCaseService
from accounts.permissions import CanManageCase
import json
import logging
from django.http import Http404

logger = logging.getLogger(__name__)


@api_view(['GET', 'PUT', 'PATCH']) 
@permission_classes([CanManageCase])
def case_detail_view(request, case_id):
    try:
        loan_case = LoanCaseService.get_case_with_related(case_id)
        if not loan_case:
            return Response({'error': '대출 건을 찾을 수 없습니다.'},
                            status=status.HTTP_404_NOT_FOUND)

        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'},
                            status=status.HTTP_403_FORBIDDEN)

        context = {
            'loan_case': loan_case.to_dict(),
            'status_choices': dict(LoanCase.STATUS_CHOICES),
            'business_type_choices': dict(LoanCase.BUSINESS_TYPE_CHOICES),
            'vat_status_choices': dict(LoanCase.VAT_STATUS_CHOICES),
            'price_type_choices': dict(LoanCase.PRICE_TYPE_CHOICES),
            'scheduled_statuses': ['자서예정', '기표예정'],
            'security_providers': [provider.to_dict() for provider in loan_case.security_providers.all()],
            'prior_loans': [loan.to_dict() for loan in loan_case.prior_loans.all()]
        }

        return Response(context)
    except Exception as e:
        logger.error(f"Error in case_detail_view for case {case_id}: {str(e)}",
                    exc_info=True)  # 스택 트레이스 추가
        return Response({'error': '대출 건 정보를 불러오는 중 오류가 발생했습니다.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])  # PATCH 메서드 추가
@permission_classes([CanManageCase])
def case_update_view(request, case_id):
    try:
        loan_case = get_object_or_404(LoanCase, id=case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        # 업데이트된 케이스 정보 반환
        updated_case = LoanCaseService.update_case_info(case_id, request.data)
        
        return Response({
            'loan_case': updated_case.to_dict(),
            'status_choices': dict(LoanCase.STATUS_CHOICES),
            'business_type_choices': dict(LoanCase.BUSINESS_TYPE_CHOICES),
            'vat_status_choices': dict(LoanCase.VAT_STATUS_CHOICES),
            'price_type_choices': dict(LoanCase.PRICE_TYPE_CHOICES),
            'scheduled_statuses': ['자서예정', '기표예정'],
            'security_providers': [provider.to_dict() for provider in updated_case.security_providers.all()],
            'prior_loans': [loan.to_dict() for loan in updated_case.prior_loans.all()]
        })
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error updating case {case_id}: {str(e)}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH'])
@permission_classes([CanManageCase])
def case_status_view(request, case_id):
    try:
        loan_case = get_object_or_404(LoanCase, id=case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': '상태값이 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(
            f"Status Change Attempt - Current: {loan_case.status}, New: {new_status}")

        # LoanCaseService의 update_case_status 메서드 사용
        success = LoanCaseService.update_case_status(case_id, new_status)
        if success:
            return Response({'message': '상태가 변경되었습니다.'})
        return Response({'error': '유효하지 않은 상태 변경입니다.'}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in status change: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([CanManageCase])
def case_schedule_view(request, case_id):
    try:
        loan_case = get_object_or_404(LoanCase, id=case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        LoanCaseService.set_schedule_date(
            case_id, request.data.get('scheduled_date'))
        return Response({'message': '예정일이 설정되었습니다.'})
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([CanManageCase])
def case_urgent_view(request, case_id):
    try:
        loan_case = get_object_or_404(LoanCase, id=case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        is_urgent = LoanCaseService.toggle_urgent_status(case_id)
        return Response({
            'message': f'긴급처리 상태가 {"설정" if is_urgent else "해제"}되었습니다.',
            'is_urgent': is_urgent
        })
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([CanManageCase])
def update_loan_info_view(request, case_id):
    try:
        loan_case = get_object_or_404(LoanCase, id=case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        LoanCaseService.update_loan_info(case_id, request.data)
        return Response({'message': '대출 정보가 업데이트되었습니다.'})
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([CanManageCase])
def update_collateral_info_view(request, case_id):
    try:
        loan_case = get_object_or_404(LoanCase, id=case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        LoanCaseService.update_collateral_info(case_id, request.data)
        return Response({'message': '담보 정보가 업데이트되었습니다.'})
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([CanManageCase])
def update_business_info_view(request, case_id):
    try:
        loan_case = get_object_or_404(LoanCase, id=case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        LoanCaseService.update_business_info(case_id, request.data)
        return Response({'message': '사업자 정보가 업데이트되었습니다.'})
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([CanManageCase])
def case_delete_view(request, case_id):
    try:
        loan_case = get_object_or_404(LoanCase, id=case_id)
        
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
        
        # 삭제 전에 존재 여부 한 번 더 확인
        if LoanCase.objects.filter(id=case_id).exists():
            loan_case.delete()
            return Response({'message': '대출 건이 삭제되었습니다.'}, status=status.HTTP_204_NO_CONTENT)
        else:
            return Response({'error': '이미 삭제된 대출 건입니다.'}, status=status.HTTP_404_NOT_FOUND)

    except Http404:
        return Response({'error': '대출 건을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error deleting case {case_id}: {str(e)}", exc_info=True)
        return Response(
            {'error': '삭제 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )