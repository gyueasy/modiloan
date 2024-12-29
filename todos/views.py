from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters import rest_framework as filters
from django.utils import timezone
from datetime import timedelta
from .models import Todo, TodoTemplate
from rest_framework.decorators import action
from rest_framework.response import Response
from .serializers import TodoSerializer, TodoTemplateSerializer, TodoHistorySerializer
from rest_framework import status
from accounts.models import User
from core.models import LoanCase
from django.db.models import Q


class TodoPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class TodoFilter(filters.FilterSet):
    deadline_status = filters.CharFilter(method='filter_deadline_status')
    my_todos = filters.BooleanFilter(method='filter_my_todos')
    
    class Meta:
        model = Todo
        fields = {
            'status': ['exact'],
            'priority': ['exact'],
            'loan_case': ['exact'],
            'assigned_to': ['exact'],
            'deadline': ['gte', 'lte'],
            'is_archived': ['exact'],
        }
    
    def filter_deadline_status(self, queryset, name, value):
        today = timezone.now().date()
        
        if value == 'overdue':
            return queryset.filter(
                deadline__date__lt=today,
                status__in=['pending', 'in_progress']
            )
        elif value == 'today':
            return queryset.filter(deadline__date=today)
        elif value == 'upcoming':
            return queryset.filter(
                deadline__date__gt=today,
                deadline__date__lte=today + timedelta(days=7)
            )
        return queryset
    
    def filter_my_todos(self, queryset, name, value):
        if value and self.request.user:
            return queryset.filter(
                assigned_to=self.request.user
            )
        return queryset

class TodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TodoPagination
    filter_backends = [filters.DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TodoFilter
    search_fields = ['title', 'content']
    ordering_fields = ['priority', 'deadline', 'created_at']

    def get_loan_cases(self):
        # 현재 사용자가 접근 가능한 대출 건만 반환
        return LoanCase.objects.filter(
            Q(manager=self.request.user) | 
            Q(referrer=self.request.user)
        )

    def get_queryset(self):
        loan_case = self.request.query_params.get('loan_case', None)
        
        # loan_case 파라미터가 있을 때만 필터링하고,
        # 없을 때는 현재 사용자의 모든 todo를 반환하도록 수정
        if loan_case:
            try:
                loan_case_id = int(loan_case)
                return Todo.objects.filter(loan_case_id=loan_case_id, is_archived=False)
            except (ValueError, TypeError):
                return Todo.objects.none()
        
        # loan_case 파라미터가 없을 때는 사용자의 모든 todo 반환
        return Todo.objects.filter(
            Q(created_by=self.request.user) | 
            Q(assigned_to=self.request.user),
            is_archived=False
        ).order_by('-priority', 'deadline')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        today = timezone.now().date()
        queryset = self.get_queryset()

        # 전체 현황 통계
        total_stats = {
            'total': queryset.count(),
            'pending': queryset.filter(status='pending').count(),
            'in_progress': queryset.filter(status='in_progress').count(),
            'completed': queryset.filter(status='completed').count(),
        }

        # 데드라인 기준 통계
        deadline_stats = {
            'overdue': queryset.filter(
                deadline__date__lt=today,
                status__in=['pending', 'in_progress']
            ).count(),
            'today': queryset.filter(deadline__date=today).count(),
            'this_week': queryset.filter(
                deadline__date__gt=today,
                deadline__date__lte=today + timedelta(days=7)
            ).count(),
        }

        # 우선순위별 통계
        priority_stats = {
            'high': queryset.filter(priority=3).count(),
            'medium': queryset.filter(priority=2).count(),
            'low': queryset.filter(priority=1).count(),
        }

        # 내 할일 통계
        my_todos = {
            'total': queryset.filter(assigned_to=request.user).count(),
            'overdue': queryset.filter(
                assigned_to=request.user,
                deadline__date__lt=today,
                status__in=['pending', 'in_progress']
            ).count(),
            'today': queryset.filter(
                assigned_to=request.user,
                deadline__date=today
            ).count(),
        }

        return Response({
            'total_stats': total_stats,
            'deadline_stats': deadline_stats,
            'priority_stats': priority_stats,
            'my_todos': my_todos
        })
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        todo_ids = request.data.get('todo_ids', [])
        action_type = request.data.get('action_type')
        value = request.data.get('value')

        if not todo_ids:
            return Response(
                {"error": "할일 ID 목록이 필요합니다."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        todos = Todo.objects.filter(id__in=todo_ids)
        
        if not todos.exists():
            return Response(
                {"error": "유효한 할일이 없습니다."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        if action_type == 'status':
            if value not in dict(Todo.STATUS_CHOICES):
                return Response(
                    {"error": "유효하지 않은 상태입니다."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            todos.update(status=value)

        elif action_type == 'assign':
            try:
                assigned_to = User.objects.get(id=value)
                todos.update(assigned_to=assigned_to)
            except User.DoesNotExist:
                return Response(
                    {"error": "유효하지 않은 사용자입니다."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        elif action_type == 'archive':
            todos.update(is_archived=value)

        else:
            return Response(
                {"error": "유효하지 않은 action_type입니다."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            "message": "성공적으로 업데이트되었습니다.",
            "updated_count": todos.count()
        })

    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        todo_ids = request.data.get('todo_ids', [])
        
        if not todo_ids:
            return Response(
                {"error": "할일 ID 목록이 필요합니다."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        deleted_count = Todo.objects.filter(id__in=todo_ids).delete()[0]
        
        return Response({
            "message": "성공적으로 삭제되었습니다.",
            "deleted_count": deleted_count
        })
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        todo = self.get_object()
        histories = todo.histories.all().order_by('-changed_at')
        serializer = TodoHistorySerializer(histories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_from_template(self, request):
        template_id = request.data.get('template_id')
        loan_case_id = request.data.get('loan_case_id')
        deadline = request.data.get('deadline')

        try:
            template = TodoTemplate.objects.get(id=template_id)
            todo_data = {
                'loan_case': loan_case_id,
                'title': template.title,
                'content': template.content,
                'priority': template.priority,
                'deadline': deadline
            }
            serializer = self.get_serializer(data=todo_data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except TodoTemplate.DoesNotExist:
            return Response(
                {"error": "템플릿을 찾을 수 없습니다."}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
class TodoTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = TodoTemplateSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']  # 허용할 HTTP 메소드 명시
    
    def get_queryset(self):
        return TodoTemplate.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # 옵션으로 추가: POST 요청 처리를 좀 더 명시적으로 하고 싶다면
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)