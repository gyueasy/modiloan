# core/services/security_provider_service.py
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import ValidationError
from core.models import SecurityProvider, LoanCase
from .base_service import BaseService


class SecurityProviderService(BaseService):
    @staticmethod
    def get_providers_for_case(loan_case_id):
        """특정 대출건의 모든 담보제공자 조회"""
        return SecurityProvider.objects.select_related(
            'loan_case',
            'related_person'
        ).filter(loan_case_id=loan_case_id)

    @staticmethod
    def get_provider(provider_id):
        """특정 담보제공자 조회"""
        return get_object_or_404(SecurityProvider, id=provider_id)

    @staticmethod
    @transaction.atomic
    def create_provider(loan_case_id, provider_data):
        """담보제공자 생성"""
        try:
            loan_case = get_object_or_404(LoanCase, id=loan_case_id)

            # 데이터 유효성 검증
            errors = SecurityProviderService.validate_provider_data(
                provider_data)
            if errors:
                raise ValidationError(errors)

            # 담보제공자 생성
            provider = SecurityProvider.objects.create(
                loan_case=loan_case,
                name=provider_data['name'],
                birth_date=provider_data.get('birth_date'),
                phone=provider_data.get('phone'),
                credit_score=provider_data.get('credit_score'),
                relationship_type=provider_data.get('relationship_type')
            )

            # 연관된 담보제공자 설정
            if provider_data.get('related_person_id'):
                related_person = SecurityProvider.objects.get(
                    id=provider_data['related_person_id'],
                    loan_case_id=loan_case_id  # 같은 대출건의 담보제공자만 연결 가능
                )
                provider.related_person = related_person
                provider.save()

            return provider

        except SecurityProvider.DoesNotExist:
            raise ValidationError('연관된 담보제공자를 찾을 수 없습니다.')
        except Exception as e:
            raise ValidationError(f'담보제공자 생성 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    @transaction.atomic
    def update_provider(provider_id, provider_data):
        """담보제공자 정보 업데이트"""
        try:
            provider = get_object_or_404(SecurityProvider, id=provider_id)

            # 데이터 유효성 검증
            errors = SecurityProviderService.validate_provider_data(
                provider_data)
            if errors:
                raise ValidationError(errors)

            # 기본 정보 업데이트
            provider.name = provider_data['name']
            provider.birth_date = provider_data.get('birth_date')
            provider.phone = provider_data.get('phone')
            provider.credit_score = provider_data.get('credit_score')
            provider.relationship_type = provider_data.get('relationship_type')

            # 연관된 담보제공자 업데이트
            if provider_data.get('related_person_id'):
                related_person = SecurityProvider.objects.get(
                    id=provider_data['related_person_id'],
                    loan_case=provider.loan_case  # 같은 대출건의 담보제공자만 연결 가능
                )
                provider.related_person = related_person
            else:
                provider.related_person = None

            provider.save()
            return provider

        except SecurityProvider.DoesNotExist:
            raise ValidationError('담보제공자를 찾을 수 없습니다.')
        except Exception as e:
            raise ValidationError(f'담보제공자 수정 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    @transaction.atomic
    def delete_provider(loan_case_id, provider_id):
        """담보제공자 삭제"""
        try:
            provider = get_object_or_404(
                SecurityProvider,
                id=provider_id,
                loan_case_id=loan_case_id
            )

            # 이 담보제공자를 참조하는 다른 담보제공자들의 관계 제거
            SecurityProvider.objects.filter(
                related_person=provider
            ).update(related_person=None)

            provider.delete()
            return True

        except SecurityProvider.DoesNotExist:
            raise ValidationError('담보제공자를 찾을 수 없습니다.')
        except Exception as e:
            raise ValidationError(f'담보제공자 삭제 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    def validate_provider_data(provider_data):
        """담보제공자 데이터 유효성 검증"""
        errors = []

        # 필수 필드 검증
        if not provider_data.get('name'):
            errors.append('이름은 필수 입력 항목입니다.')

        # 생년월일 형식 검증
        birth_date = provider_data.get('birth_date')
        if birth_date:
            if not birth_date.isdigit() or len(birth_date) != 6:
                errors.append('생년월일은 6자리 숫자로 입력해주세요.')

        # 신용점수 범위 검증
        credit_score = provider_data.get('credit_score')
        if credit_score:
            try:
                score = int(credit_score)
                if not (1 <= score <= 1000):
                    errors.append('신용점수는 1~1000 사이의 값이어야 합니다.')
            except ValueError:
                errors.append('신용점수는 숫자여야 합니다.')

        # 전화번호 형식 검증
        phone = provider_data.get('phone')
        if phone:
            import re
            if not re.match(r'^\d{2,3}-\d{3,4}-\d{4}$', phone):
                errors.append('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)')

        return errors
    
    @staticmethod
    def get_loan_case(case_id):
        return get_object_or_404(LoanCase, id=case_id)
    
    @staticmethod
    def get_providers_for_case(loan_case_id):
        """특정 대출건의 모든 담보제공자 조회"""
        loan_case = SecurityProviderService.get_loan_case(loan_case_id)  # BaseService 메서드 사용
        if not loan_case:
            return []
            
        return SecurityProvider.objects.select_related(
            'loan_case',
            'related_person'
        ).filter(loan_case_id=loan_case_id)