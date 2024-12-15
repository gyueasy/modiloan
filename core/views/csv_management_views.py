from django.http import HttpResponse
import csv
from django.utils import timezone
from ..models import LoanCase
from ..serializers import CsvExportSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def export_cases_to_csv(request):
    # 필터링 옵션 적용 가능
    queryset = LoanCase.objects.all()
    
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="loan_cases_{timezone.now().date()}.csv"'

    serializer = CsvExportSerializer(queryset, many=True)
    
    # CSV 작성
    writer = csv.writer(response)
    
    # 헤더 작성
    writer.writerow(serializer.data[0].keys() if serializer.data else [])
    
    # 데이터 작성
    for data in serializer.data:
        writer.writerow(data.values())

    return response

def import_cases_from_csv(request):
    pass