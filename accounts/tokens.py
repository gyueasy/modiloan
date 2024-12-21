# accounts/tokens.py
from rest_framework_simplejwt.tokens import RefreshToken

class CustomToken(RefreshToken):
    def __init__(self, user=None, *args, **kwargs):
        super().__init__(user, *args, **kwargs)
        
        # user가 제공된 경우 추가 클레임 설정
        if user is not None:
            self.setup_custom_claims(user)
    
    def setup_custom_claims(self, user):
        # access 토큰에 추가할 클레임 설정
        self['role'] = user.role
        self['username'] = user.username
        self['is_staff'] = user.is_staff
        
        # branch와 team 정보 추가 (해당 필드가 있는 경우)
        if hasattr(user, 'branch') and user.branch:
            self['branch_id'] = user.branch.id
            self['branch_name'] = user.branch.name
        
        if hasattr(user, 'team') and user.team:
            self['team_id'] = user.team.id
            self['team_name'] = user.team.name

    @property
    def access_token(self):
        access = super().access_token
        
        # refresh 토큰의 커스텀 클레임을 access 토큰에도 복사
        custom_claims = ['role', 'username', 'is_staff', 'branch_id', 
                        'branch_name', 'team_id', 'team_name']
        
        for claim in custom_claims:
            if claim in self:
                access[claim] = self[claim]
        
        return access