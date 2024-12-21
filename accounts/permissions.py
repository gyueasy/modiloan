# permissions.py
from rest_framework.permissions import BasePermission

class IsBranchManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'branch_manager'

class IsTeamLeader(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'team_leader'

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin' and request.user.is_staff

class CanManageEvent(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['admin', 'branch_manager', 'team_leader']

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == 'admin':
            return True
        elif user.role == 'branch_manager':
            return obj.loan_case.manager.branch == user.branch
        elif user.role == 'team_leader':
            return obj.loan_case.manager.team == user.team
        return obj.loan_case.manager == user

class CanManageEvent(BasePermission):
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
            return obj.loan_case.manager.branch == user.branch
        elif user.role == 'team_leader':
            return obj.loan_case.manager.team == user.team
        return obj.loan_case.manager == user