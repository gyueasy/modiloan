# views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, logout, login
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from .permissions import IsAdmin

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    role = request.data.get('role')

    if not all([username, password, role]):
        return Response({'error': '필수 항목을 모두 입력하세요.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if role not in dict(User.ROLE_CHOICES):
        return Response({'error': '잘못된 역할입니다.'}, status=status.HTTP_400_BAD_REQUEST)

    role_hierarchy = {
        'admin': ['branch_manager', 'team_leader', 'staff'],
        'branch_manager': ['team_leader', 'staff'],
        'team_leader': ['staff'],
        'staff': []
    }

    requester_role = request.user.role
    
    # admin 생성은 is_staff 사용자만 가능
    if role == 'admin' and not request.user.is_staff:
        return Response({'error': '관리자 계정 생성 권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
    
    if role not in role_hierarchy.get(requester_role, []):
        return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

    user = User.objects.create_user(
        username=username,
        password=password,
        role=role
    )
    
    refresh = RefreshToken.for_user(user)
    return Response({
        'success': True,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not all([username, password]):
        return Response({'error': '아이디와 비밀번호를 모두 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'success': True,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': user.role
        })
    return Response({'error': '아이디 또는 비밀번호가 올바르지 않습니다.'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    for token in OutstandingToken.objects.filter(user=request.user):
        _, _ = BlacklistedToken.objects.get_or_create(token=token)
    logout(request)
    return Response({'success': True})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user
    return Response({
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'phone': user.phone,
        'join_date': user.join_date,
        'profile_image': user.profile_image.url if user.profile_image else None,
        'department': user.department
    })

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def profile_edit_view(request):
    user = request.user
    fields = ['first_name', 'last_name', 'email', 'phone', 'department', 'profile_image']
    
    for field in fields:
        if field in request.data:
            setattr(user, field, request.data[field])
    
    user.save()
    return Response({
        'success': True,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'phone': user.phone,
        'join_date': user.join_date,
        'profile_image': user.profile_image.url if user.profile_image else None,
        'department': user.department
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def protected_view(request):
    return Response({'message': '이 페이지는 인증된 사용자만 볼 수 있습니다.'})