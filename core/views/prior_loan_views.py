# core/views/prior_loan_views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from ..services.prior_loan_service import PriorLoanService
from accounts.permissions import CanManageCase
import logging

logger = logging.getLogger(__name__)

@api_view(['GET', 'POST'])
@permission_classes([CanManageCase])
def prior_loan_list_view(request, case_id):
    try:
        loan_case = PriorLoanService.get_loan_case(case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            prior_loans = PriorLoanService.get_prior_loans_for_case(case_id)
            total_amount = PriorLoanService.get_total_amount(case_id)
            return Response({
                'prior_loans': [loan.to_dict() for loan in prior_loans],
                'total_amount': total_amount
            })

        loan = PriorLoanService.create_prior_loan(case_id, request.data)
        return Response({
            'message': '선설정/대환이 추가되었습니다.',
            'prior_loan': loan.to_dict()
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error(f"Error in prior_loan_list_view: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([CanManageCase])
def prior_loan_detail_view(request, case_id, loan_id):
    try:
        loan_case = PriorLoanService.get_loan_case(case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            loan = PriorLoanService.get_prior_loan(loan_id)
            return Response({'prior_loan': loan.to_dict()})

        if request.method == "PUT":
            loan = PriorLoanService.update_prior_loan(loan_id, request.data)
            return Response({
                'message': '선설정/대환 정보가 수정되었습니다.',
                'prior_loan': loan.to_dict()
            })

        if request.method == "DELETE":
            PriorLoanService.delete_prior_loan(case_id, loan_id)
            return Response({'message': '선설정/대환이 삭제되었습니다.'})

    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in prior_loan_detail_view: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

