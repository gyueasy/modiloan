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

# Serializer 정의
# core/views/event_views.py
class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'

    def create(self, validated_data):
        # loan_case_id를 받아서 처리
        loan_case_id = validated_data.pop('loan_case_id', None)  # loan_case_id를 가져오기
        if loan_case_id:
            loan_case = LoanCase.objects.get(id=loan_case_id)  # loan_case 객체를 가져오기
            event = Event.objects.create(loan_case=loan_case, **validated_data)  # loan_case를 할당하여 이벤트 생성
        else:
            event = Event.objects.create(**validated_data)
        return event
    
# Event API View 정의
class EventListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, CanManageEvent]

    def create(self, request, *args, **kwargs):
        logger.info(f"Creating event with data: {request.data}")
        try:
            return super().create(request, *args, **kwargs)
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

        # start와 end 파라미터가 없으면 기본적으로 30일 전후로 설정
        if not start_str or not end_str:
            today = datetime.now()
            start_date = today - timedelta(days=30)
            end_date = today + timedelta(days=30)
        else:
            start_date = datetime.strptime(start_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_str, '%Y-%m-%d')

        # 이벤트를 날짜 범위로 필터링
        return Event.objects.filter(scheduled_date__range=[start_date, end_date])

class EventDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, CanManageEvent]


class CaseEventListView(generics.ListAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, CanManageEvent]

    def get_queryset(self):
        case_id = self.kwargs.get('case_id')
        return Event.objects.filter(loan_case_id=case_id)