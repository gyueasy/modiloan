from django.shortcuts import get_object_or_404
from ..models import LoanCase

class BaseService:
    @staticmethod
    def get_loan_case(case_id):
        return get_object_or_404(LoanCase, id=case_id)