from rest_framework import filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.generics import ListAPIView
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter, ChoiceFilter
from ..models import LoanCase
from accounts.permissions import CanManageCase
from ..serializers import LoanCaseSerializer
from django.shortcuts import render
from core.models import LoanCase
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

class LoanCaseFilter(FilterSet):
    borrower_name = CharFilter(lookup_expr='icontains')
    status = ChoiceFilter(choices=LoanCase.STATUS_CHOICES)
    
    class Meta:
        model = LoanCase
        fields = ['borrower_name', 'status', 'is_urgent']

class LoanCaseListView(ListAPIView):
    permission_classes = [CanManageCase]
    serializer_class = LoanCaseSerializer
    pagination_class = PageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = LoanCaseFilter
    search_fields = ['borrower_name', 'borrower_phone', 'address_main']
    ordering_fields = ['created_at', 'updated_at', 'loan_amount']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return LoanCase.objects.all()
        elif user.role == 'branch_manager':
            return LoanCase.objects.filter(manager__branch=user.branch)
        elif user.role == 'team_leader':
            return LoanCase.objects.filter(manager__team=user.team)
        return LoanCase.objects.filter(manager=user)

@api_view(['POST'])
@permission_classes([CanManageCase])
def case_create_api_view(request):
    try:
        print("Received data:", request.data)  # 받은 데이터 출력
        serializer = LoanCaseSerializer(data=request.data)
        if serializer.is_valid():
            # 현재 로그인한 유저를 manager로 지정
            loan_case = serializer.save(manager=request.user)
            return Response(
                loan_case.to_dict(),
                status=status.HTTP_201_CREATED
            )
        print("Serializer errors:", serializer.errors)  # 에러 출력
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error creating case: {str(e)}", exc_info=True)
        return Response(
            {'error': '케이스 생성 중 오류가 발생했습니다.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def case_list_view(request):
    context = {
        'status_choices': dict(LoanCase.STATUS_CHOICES),
        'business_type_choices': dict(LoanCase.BUSINESS_TYPE_CHOICES),
        'vat_status_choices': dict(LoanCase.VAT_STATUS_CHOICES),
        'price_type_choices': dict(LoanCase.PRICE_TYPE_CHOICES),
    }
    return render(request, 'core/case_list.html', context)

def case_add_view(request):
    context = {
        'status_choices': dict(LoanCase.STATUS_CHOICES),
        'business_type_choices': dict(LoanCase.BUSINESS_TYPE_CHOICES),
        'vat_status_choices': dict(LoanCase.VAT_STATUS_CHOICES),
        'price_type_choices': dict(LoanCase.PRICE_TYPE_CHOICES),
    }
    return render(request, 'core/case_add.html', context)