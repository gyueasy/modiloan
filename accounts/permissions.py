# permissions.py
from rest_framework.permissions import BasePermission
import logging

logger = logging.getLogger(__name__)

class IsBranchManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'branch_manager'

class IsTeamLeader(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'team_leader'

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin' and request.user.is_staff

class CanManageCase(BasePermission):
    def has_permission(self, request, view):
        # 로그인하지 않은 사용자 체크 추가
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['admin', 'branch_manager', 'team_leader']

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == 'admin':
            return True
        elif user.role == 'branch_manager':
            return obj.manager.branch == user.branch
        elif user.role == 'team_leader':
            return obj.manager.team == user.team
        return obj.manager == user

class CanManageCase(BasePermission):
    def has_permission(self, request, view):
        logger.info("=== CanManageCase 권한 체크 ===")
        logger.info(f"User: {request.user}")
        logger.info(f"Role: {getattr(request.user, 'role', None)}")
        
        if not request.user or not request.user.is_authenticated:
            logger.info("인증되지 않은 사용자")
            return False
        
        has_permission = request.user.role in ['admin', 'branch_manager', 'team_leader']
        logger.info(f"권한 체크 결과: {has_permission}")
        return has_permission
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == 'admin':
            return True
        elif user.role == 'branch_manager':
            return obj.loan_case.manager.branch == user.branch
        elif user.role == 'team_leader':
            return obj.loan_case.manager.team == user.team
        return obj.loan_case.manager == user