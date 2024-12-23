from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import Sum
from core.models import PriorLoan, LoanCase
from .base_service import BaseService


class PriorLoanService(BaseService):
    @staticmethod
    def get_prior_loans_for_case(loan_case_id):
        """특정 대출건의 모든 선설정/대환 조회"""
        loan_case = PriorLoanService.get_loan_case(
            loan_case_id)  # BaseService 메서드 사용
        if not loan_case:
            return []

        return PriorLoan.objects.select_related('loan_case').filter(
            loan_case_id=loan_case_id
        ).order_by('loan_type', '-amount')
    
    @staticmethod
    def get_prior_loan(loan_id):
        """특정 선설정/대환 조회"""
        try:
            loan = get_object_or_404(PriorLoan, id=loan_id)
            return loan
        except PriorLoan.DoesNotExist:
            raise ValidationError('선설정/대환 정보를 찾을 수 없습니다.')

    @staticmethod
    @transaction.atomic
    def create_prior_loan(loan_case_id, loan_data):
        """선설정/대환 생성"""
        try:
            loan_case = get_object_or_404(LoanCase, id=loan_case_id)

            # 데이터 유효성 검증
            errors = PriorLoanService.validate_prior_loan_data(loan_data)
            if errors:
                raise ValidationError(errors)

            # LTV 검증 (선설정인 경우에만)
            if loan_data['loan_type'] == '선설정':  # 선설정일 때만 체크
                if not PriorLoanService._validate_ltv_limit(loan_case, loan_data.get('amount', 0)):
                    raise ValidationError('설정 가능한 최대 금액을 초과했습니다.')

            # 선설정/대환 생성
            prior_loan = PriorLoan.objects.create(
                loan_case=loan_case,
                loan_type=loan_data['loan_type'],
                financial_company=loan_data['financial_company'],
                amount=loan_data['amount']
            )

            return prior_loan

        except Exception as e:
            raise ValidationError(f'선설정/대환 생성 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    @transaction.atomic
    def update_prior_loan(prior_loan_id, loan_data):
        """선설정/대환 정보 업데이트"""
        try:
            prior_loan = get_object_or_404(PriorLoan, id=prior_loan_id)

            # 데이터 유효성 검증
            errors = PriorLoanService.validate_prior_loan_data(loan_data)
            if errors:
                raise ValidationError(errors)

            # 변경된 금액으로 LTV 검증 (선설정인 경우에만)
            if loan_data['loan_type'] == '선설정':
                current_amount = prior_loan.amount if prior_loan.loan_type == '선설정' else 0
                new_amount = int(loan_data['amount'])
                amount_diff = new_amount - current_amount

                if not PriorLoanService._validate_ltv_limit(prior_loan.loan_case, amount_diff):
                    raise ValidationError('설정 가능한 최대 금액을 초과했습니다.')

            # 정보 업데이트
            prior_loan.loan_type = loan_data['loan_type']
            prior_loan.financial_company = loan_data['financial_company']
            prior_loan.amount = int(loan_data['amount'])
            prior_loan.save()

            return prior_loan

        except PriorLoan.DoesNotExist:
            raise ValidationError('선설정/대환 정보를 찾을 수 없습니다.')
        except Exception as e:
            raise ValidationError(f'선설정/대환 수정 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    @transaction.atomic
    def delete_prior_loan(loan_case_id, prior_loan_id):
        """선설정/대환 삭제"""
        try:
            prior_loan = get_object_or_404(
                PriorLoan,
                id=prior_loan_id,
                loan_case_id=loan_case_id
            )
            prior_loan.delete()
            return True

        except PriorLoan.DoesNotExist:
            raise ValidationError('선설정/대환 정보를 찾을 수 없습니다.')
        except Exception as e:
            raise ValidationError(f'선설정/대환 삭제 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    def get_total_amount(loan_case_id):
        """특정 대출건의 전체 선설정/대환 금액 합계"""
        # 선설정 금액만 합산하도록 수정
        total = PriorLoan.objects.filter(
            loan_case_id=loan_case_id,
            loan_type='선설정'  # 선설정만 필터링
        ).aggregate(
            total_amount=Sum('amount')
        )['total_amount']
        return total or 0

    @staticmethod
    def validate_prior_loan_data(loan_data):
        """선설정/대환 데이터 유효성 검증"""
        errors = []

        # 대출 구분 검증
        loan_type = loan_data.get('loan_type')
        if not loan_type:
            errors.append('대출 구분은 필수 입력 항목입니다.')
        elif loan_type not in ['선설정', '대환']:
            errors.append('대출 구분은 선설정 또는 대환이어야 합니다.')

        # 금융사 검증
        if not loan_data.get('financial_company'):
            errors.append('금융사는 필수 입력 항목입니다.')
        elif len(loan_data['financial_company']) > 50:
            errors.append('금융사명이 너무 깁니다.')

        # 금액 검증
        amount = loan_data.get('amount')
        if amount:
            try:
                amount = int(amount)
                if amount <= 0:
                    errors.append('금액은 0보다 커야 합니다.')
                elif amount > 1000000:  # 10억원 초과 체크
                    errors.append('금액이 너무 큽니다. (최대 10억원)')
            except ValueError:
                errors.append('금액은 숫자여야 합니다.')
        else:
            errors.append('금액은 필수 입력 항목입니다.')

        return errors

    @staticmethod
    def _validate_ltv_limit(loan_case, additional_amount):
        """LTV 한도 검증"""
        if not loan_case.price_amount:
            return True

        # 새로운 금액만 체크
        max_amount = loan_case.price_amount  # LTV 제거, 시세 금액 그대로 사용
        return additional_amount <= max_amount

    @staticmethod
    def format_amount(amount):
        """금액 포맷팅 (단위: 만원)"""
        try:
            amount = int(amount)
            if amount >= 10000:
                억 = amount // 10000
                만 = amount % 10000
                if 만 > 0:
                    return f"{억}억 {만}만원"
                return f"{억}억원"
            return f"{amount}만원"
        except:
            return str(amount)
