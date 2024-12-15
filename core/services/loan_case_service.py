# core/services/loan_case_service.py
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import ValidationError, ObjectDoesNotExist, PermissionDenied
from django.utils import timezone
from datetime import datetime, timedelta
from core.models import (
    LoanCase,
    ConsultingLog,
    CaseComment,
    SecurityProvider,
    PriorLoan
)
from .base_service import BaseService
import logging

logger = logging.getLogger(__name__)

class LoanCaseService(BaseService):
    # 기존 메서드들 유지하면서, get_case_with_related 메서드 수정
    @staticmethod
    def get_case_with_related(case_id):
        """관련 데이터를 포함한 대출 건 조회"""
        loan_case = LoanCaseService.get_loan_case(case_id)  # BaseService 메서드 사용
        if not loan_case:
            return None
            
        return LoanCase.objects.select_related(
            'manager'
        ).prefetch_related(
            'security_providers',
            'prior_loans',
            'consulting_logs',
            'comments'
        ).get(id=case_id)

    @staticmethod
    @transaction.atomic
    def update_case_info(case_id, data):
        loan_case = get_object_or_404(LoanCase, id=case_id)
        
        # 로그 추가: 수신된 데이터
        logger.debug(f"Updating LoanCase {case_id} with data: {data}")
        
        # 필수 필드 업데이트
        loan_case.borrower_name = data.get('borrower_name', loan_case.borrower_name)
        loan_case.borrower_phone = data.get('borrower_phone', loan_case.borrower_phone)
        loan_case.borrower_birth = data.get('borrower_birth', loan_case.borrower_birth)
        loan_case.borrower_credit_score = data.get('borrower_credit_score', loan_case.borrower_credit_score)
        loan_case.address_main = data.get('address_main', loan_case.address_main)
        loan_case.address_detail = data.get('address_detail', loan_case.address_detail)
        loan_case.area = float(data.get('area', loan_case.area)) if data.get('area') else loan_case.area
        loan_case.price_type = data.get('price_type', loan_case.price_type)
        loan_case.price_amount = data.get('price_amount', loan_case.price_amount)
        loan_case.business_type = data.get('business_type', loan_case.business_type)
        loan_case.monthly_sales = data.get('monthly_sales', loan_case.monthly_sales)
        loan_case.vat_status = data.get('vat_status', loan_case.vat_status)
        loan_case.other_income = data.get('other_income', loan_case.other_income)
        loan_case.residents = data.get('residents', loan_case.residents)
        loan_case.loan_amount = data.get('loan_amount', loan_case.loan_amount)
        loan_case.interest_rate = float(data.get('interest_rate', loan_case.interest_rate)) if data.get('interest_rate') else loan_case.interest_rate
        loan_case.is_urgent = data.get('is_urgent', loan_case.is_urgent)
        loan_case.reception_date = data.get('reception_date', loan_case.reception_date)
        loan_case.authorizing_date = data.get('authorizing_date', loan_case.authorizing_date)
        loan_case.journalizing_date = data.get('journalizing_date', loan_case.journalizing_date)
        loan_case.scheduled_date = data.get('scheduled_date', loan_case.scheduled_date)
        # 새로 추가된 필드들
        loan_case.referrer = data.get('referrer', loan_case.referrer)
        loan_case.introducer = data.get('introducer', loan_case.introducer)
        loan_case.loan_type = data.get('loan_type', loan_case.loan_type)
        
        # 사업자 정보 신규 필드
        loan_case.business_number = data.get('business_number', loan_case.business_number)
        loan_case.business_category = data.get('business_category', loan_case.business_category)
        loan_case.business_item = data.get('business_item', loan_case.business_item)


        # 체크박스 필드 업데이트
        boolean_fields = [
            'is_lower_than_2nd',
            'is_commercial_residential',
            'is_above_4th_rank',
            'has_registration_issue',
            'is_trading_price_low',
            'is_fake_business',
            'is_soho',
            'need_proof_of_use',
            'is_separate_household',
            'is_tenant',
        ]

        for field in boolean_fields:
            if field in data:
                setattr(loan_case, field, data[field])
                logger.debug(f"Set {field} to {data[field]}")

        loan_case.save()
        logger.debug(f"LoanCase {case_id} updated successfully.")
        return loan_case

    @staticmethod
    @transaction.atomic
    def add_consulting_log(loan_case_id, content, user):
        """상담일지 추가"""
        try:
            if not content or not content.strip():
                raise ValidationError('상담 내용을 입력해주세요.')

            loan_case = get_object_or_404(LoanCase, id=loan_case_id)

            consulting_log = ConsultingLog.objects.create(
                loan_case=loan_case,
                content=content.strip(),
                created_by=user
            )

            return consulting_log

        except Exception as e:
            raise ValidationError(f'상담일지 추가 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    @transaction.atomic
    def add_comment(loan_case_id, content, user):
        """댓글 추가"""
        try:
            if not content or not content.strip():
                raise ValidationError('댓글 내용을 입력해주세요.')

            loan_case = get_object_or_404(LoanCase, id=loan_case_id)

            comment = CaseComment.objects.create(
                loan_case=loan_case,
                writer=user,
                content=content.strip(),
                is_question=user.role in ['admin', 'branch_manager']
            )

            return comment

        except Exception as e:
            raise ValidationError(f'댓글 추가 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    @transaction.atomic
    def update_case_status(loan_case_id, new_status, user=None):
        """대출 건 상태 업데이트"""
        try:
            loan_case = get_object_or_404(LoanCase, id=loan_case_id)
            current_status = loan_case.status
            
            logger.info(f"Attempting status change - Case ID: {loan_case_id}")
            logger.info(f"Current status: {current_status}")
            logger.info(f"New status: {new_status}")

            # 상태값이 유효한지만 체크
            if new_status in dict(LoanCase.STATUS_CHOICES):
                loan_case.status = new_status
                loan_case.save()
                return True
                
            raise ValidationError('잘못된 상태값입니다.')

        except Exception as e:
            logger.error(f"Status update failed: {str(e)}")
            raise ValidationError(f'상태 변경 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    @transaction.atomic
    def set_schedule_date(loan_case_id, scheduled_date):
        """예정일 설정"""
        try:
            loan_case = get_object_or_404(LoanCase, id=loan_case_id)

            # 과거 날짜 체크
            if scheduled_date < timezone.now().date():
                raise ValidationError('과거 날짜로 예정일을 설정할 수 없습니다.')

            # 상태에 따른 예정일 설정 가능 여부 체크
            if loan_case.status not in ['자서예정', '기표예정']:
                raise ValidationError('자서예정 또는 기표예정 상태에서만 예정일을 설정할 수 있습니다.')

            loan_case.scheduled_date = scheduled_date
            loan_case.save()

            return True, None

        except ValidationError as e:
            return False, str(e)
        except Exception as e:
            return False, f'예정일 설정 중 오류가 발생했습니다: {str(e)}'

    @staticmethod
    @transaction.atomic
    def toggle_urgent_status(loan_case_id):
        """긴급처리 ��태 토글"""
        try:
            loan_case = get_object_or_404(LoanCase, id=loan_case_id)
            loan_case.is_urgent = not loan_case.is_urgent
            loan_case.save()
            return loan_case.is_urgent
        except Exception as e:
            raise ValidationError(f'긴급처리 상태 변경 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    def mark_comments_as_read(loan_case_id, user):
        """읽지 않은 댓글 읽음 처리"""
        try:
            # 사용자 권한에 따른 읽음 처리 대상 필터링
            if user.role in ['admin', 'branch_manager']:
                unread_comments = CaseComment.objects.filter(
                    loan_case_id=loan_case_id,
                    is_question=False,
                    is_read=False
                )
            else:
                unread_comments = CaseComment.objects.filter(
                    loan_case_id=loan_case_id,
                    is_question=True,
                    is_read=False
                )

            return unread_comments.update(is_read=True)

        except Exception as e:
            raise ValidationError(f'댓글 읽음 처리 중 오류가 발생했습니다: {str(e)}')

    @staticmethod
    def validate_case_data(data):
        """대출 건 데이터 유효성 검증"""
        errors = []

        # 필수 필드 검증
        if not data.get('borrower_name'):
            errors.append('차주명은 필수 입력 항목입니다.')

        # 금액 필드 검증
        amount_fields = ['loan_amount', 'price_amount', 'monthly_sales']
        for field in amount_fields:
            if data.get(field):
                try:
                    amount = int(data[field])
                    if amount < 0:
                        errors.append(f'{field}는 0 이상이어야 합니다.')
                except ValueError:
                    errors.append(f'{field}는 숫자여야 합니다.')

        # 금리 검증
        if data.get('interest_rate'):
            try:
                rate = float(data['interest_rate'])
                if not (0 <= rate <= 100):
                    errors.append('금리는 0~100 사이의 값이어야 합니다.')
            except ValueError:
                errors.append('금리는 숫자여야 합니다.')

        return errors

    # @staticmethod
    # def _validate_status_change(current_status, new_status):
    #     """상태 변경 가능 여부 검증"""
    #     # 상태 흐름 정의
    #     status_flow = {
    #         '단순조회중': ['신용조회중'],
    #         '신용조회중': ['서류수취중', '단순조회중'],
    #         '서류수취중': ['심사중', '신용조회중'],
    #         '심사중': ['승인', '서류수취중'],
    #         '승인': ['자서예정', '심사중'],
    #         '자서예정': ['기표예정', '승인'],
    #         '기표예정': ['용도증빙', '자서예정'],
    #         '용도증빙': ['완료', '기표예정'],
    #         '완료': []
    #     }

    #     return new_status in status_flow.get(current_status, [])

    @staticmethod
    def delete_comment(case_id, comment_id, user):
        try:
            # 댓글 가져오기
            comment = CaseComment.objects.get(id=comment_id, loan_case_id=case_id)
            
            # 권한 확인 (예: 댓글 작성자만 삭제 가능)
            if comment.writer != user:
                raise PermissionDenied("댓글을 삭제할 권한이 없습니다.")
            
            # 댓글 삭제
            comment.delete()
        except CaseComment.DoesNotExist:
            raise ObjectDoesNotExist("해당 댓글을 찾을 수 없습니다.")
