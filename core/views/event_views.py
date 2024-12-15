# core/views/event_views.py

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import Event, LoanCase
from rest_framework import generics
from datetime import datetime
from datetime import timedelta
from rest_framework.permissions import IsAuthenticated
from core.serializers import EventSerializer
from accounts.permissions import CanManageEvent
from django.shortcuts import get_object_or_404
import logging

logger = logging.getLogger(__name__)

# core/views/event_views.py

class EventSerializer(serializers.ModelSerializer):
    event_type = serializers.ChoiceField(choices=[
        ('scheduled', '접수'),
        ('authorizing', '자서'),
        ('journalizing', '기표')
    ])
    date = serializers.DateField()

    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'event_type', 'date', 'loan_case']

    def validate(self, data):
        """
        이벤트 타입과 날짜 관련 추가 검증
        """
        event_type = data.get('event_type')
        date = data.get('date')
        loan_case = data.get('loan_case')

        if not date and loan_case:
            # loan_case의 기본 날짜를 사용
            if event_type == 'authorizing':
                date = loan_case.authorizing_date
            elif event_type == 'journalizing':
                date = loan_case.journalizing_date
            elif event_type == 'scheduled':
                date = loan_case.scheduled_date
            data['date'] = date

        if not date:
            raise serializers.ValidationError("날짜는 필수 항목입니다.")

        return data


class EventListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, CanManageEvent]

    def create(self, request, *args, **kwargs):
        logger.info(f"Creating event with data: {request.data}")
        try:
            # 단일 이벤트 또는 여러 이벤트 생성 처리
            if isinstance(request.data, list):
                serializer = self.get_serializer(data=request.data, many=True)
            else:
                serializer = self.get_serializer(data=request.data)
            
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data, 
                status=status.HTTP_201_CREATED, 
                headers=headers
            )
        except Exception as e:
            logger.error(f"Error creating event: {str(e)}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class EventListView(generics.ListAPIView):
    serializer_class = EventSerializer

    def get_queryset(self):
        start_str = self.request.GET.get('start')
        end_str = self.request.GET.get('end')

        if not start_str or not end_str:
            today = datetime.now()
            start_date = today - timedelta(days=30)
            end_date = today + timedelta(days=30)
        else:
            start_date = datetime.strptime(start_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_str, '%Y-%m-%d')

        return Event.objects.filter(date__range=[start_date, end_date])


class CaseEventListView(generics.ListAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, CanManageEvent]

    def get_queryset(self):
        case_id = self.kwargs.get('case_id')
        return Event.objects.filter(loan_case_id=case_id)
    
# core/views/event_views.py

class EventDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, CanManageEvent]

    def update(self, request, *args, **kwargs):
        logger.info(f"Updating event with data: {request.data}")
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error updating event: {str(e)}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def destroy(self, request, *args, **kwargs):
        logger.info(f"Deleting event with id: {kwargs.get('pk')}")
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error deleting event: {str(e)}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )