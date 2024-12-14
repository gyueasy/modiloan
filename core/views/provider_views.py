# core/views/provider_views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from ..services.security_provider_service import SecurityProviderService
from accounts.permissions import CanManageCase
import logging

logger = logging.getLogger(__name__)

@api_view(['GET', 'POST'])
@permission_classes([CanManageCase])
def provider_list_view(request, case_id):
    try:
        loan_case = SecurityProviderService.get_loan_case(case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            providers = SecurityProviderService.get_providers_for_case(case_id)
            return Response({'providers': [provider.to_dict() for provider in providers]})

        provider = SecurityProviderService.create_provider(case_id, request.data)
        return Response({
            'message': '담보제공자가 추가되었습니다.',
            'provider': provider.to_dict()
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error(f"Error in provider_list_view: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([CanManageCase])
def provider_detail_view(request, case_id, provider_id):
    try:
        loan_case = SecurityProviderService.get_loan_case(case_id)
        if not CanManageCase().has_object_permission(request, None, loan_case):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            provider = SecurityProviderService.get_provider(provider_id)
            return Response({'provider': provider.to_dict()})

        if request.method == "PUT":
            provider = SecurityProviderService.update_provider(provider_id, request.data)
            return Response({
                'message': '담보제공자 정보가 수정되었습니다.',
                'provider': provider.to_dict()
            })

        if request.method == "DELETE":
            SecurityProviderService.delete_provider(case_id, provider_id)
            return Response({'message': '담보제공자가 삭제되었습니다.'})

    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in provider_detail_view: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)