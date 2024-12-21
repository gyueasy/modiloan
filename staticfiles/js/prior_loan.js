// prior_loan.js
import { formatAmount } from './utils.js';

class PriorLoanManager {
    constructor() {
        this.endpoints = {};
        this.isInitialized = false;
    }

    waitForApp() {
        return new Promise((resolve) => {
            if (window.loanCaseApp?.initialized) {
                resolve();
            } else {
                document.addEventListener('appInitialized', () => resolve(), { once: true });
            }
        });
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.waitForApp();

            if (!window.loanCaseApp.caseId) {
                console.log('Case ID not found');
                return;
            }

            this.loanCaseId = window.loanCaseApp.caseId;
            console.log('PriorLoanManager initialized with caseId:', this.loanCaseId);

            this.initializeDOMElements();
            this.initializeEndpoints();
            this.setupEventListeners();
            await this.renderLoansTable();

            this.isInitialized = true;
        } catch (error) {
            window.authUtils.showToast('초기화 실패', error.message, 'error');
        }
    }

    initializeDOMElements() {
        this.loansTable = document.getElementById('priorLoansTable');
        this.addLoanBtn = document.getElementById('addPriorLoanBtn');
        this.loanModal = document.getElementById('priorLoanModal');
        this.loanForm = document.getElementById('priorLoanForm');
        this.currentLoanId = null;
    }

    initializeEndpoints() {
        this.endpoints = {
            base: `/api/cases/${window.loanCaseApp.caseId}/prior-loans/`
        };
    }

    setupEventListeners() {
        this.addLoanBtn?.addEventListener('click', () => this.openModal());
        
        this.loanForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        const amountInput = this.loanForm?.querySelector('[name="amount"]');
        amountInput?.addEventListener('input', (e) => {
            e.target.value = formatAmount(e.target.value);
        });
    }

    renderLoanRow(loan) {
        // 방어적 체크 추가
        if (!loan) return '';
    
        const typeClass = loan.loan_type === '선설정' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
        
        // amount 값이 있을 때만 formatAmount 호출
        const displayAmount = loan.amount ? formatAmount(loan.amount) : '-';
        
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
                        ${loan.loan_type || '-'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${loan.financial_company || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    ${displayAmount}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <button type="button" 
                            class="edit-btn text-blue-600 hover:text-blue-900 mr-3"
                            data-id="${loan.id}">
                        수정
                    </button>
                    <button type="button" 
                            class="delete-btn text-red-600 hover:text-red-900"
                            data-id="${loan.id}">
                        삭제
                    </button>
                </td>
            </tr>
        `;
    }

    async renderLoansTable() {
        if (!this.loansTable) return;
    
        // window.loanCaseApp.priorLoans가 존재하는지 확인
        const loans = window.loanCaseApp.priorLoans || [];
        
        // 데이터 렌더링 전에 로그
        console.log('Rendering loans:', loans);
        
        this.loansTable.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">금융사</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">관리</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${loans.map(loan => this.renderLoanRow(loan)).join('')}
                    ${this.renderTotalRow(loans)}
                </tbody>
            </table>
        `;
    
        // 이벤트 리스너 다시 연결
        this.loansTable.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openModal(btn.dataset.id));
        });
    
        this.loansTable.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteLoan(btn.dataset.id));
        });
    }

    renderTotalRow(loans) {
        const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
        return `
            <tr class="bg-gray-50 font-semibold">
                <td colspan="2" class="px-6 py-4 whitespace-nowrap">
                    총계
                </td>
                <td colspan="2" class="px-6 py-4 whitespace-nowrap text-right">
                    ${formatAmount(totalAmount)}만원
                </td>
            </tr>
        `;
    }

    async openModal(loanId = null) {
        this.currentLoanId = loanId;
        
        if (loanId) {
            try {
                const loan = await window.authUtils.fetchWithAuth(
                    `${this.endpoints.base}${loanId}/`
                );
                this.populateForm(loan);
            } catch (error) {
                window.authUtils.showToast('에러', error.message, 'error');
                return;
            }
        } else {
            this.loanForm?.reset();
        }
        
        this.loanModal?.classList.remove('hidden');
    }

    closeModal() {
        this.loanModal?.classList.add('hidden');
        this.currentLoanId = null;
        this.loanForm?.reset();
    }

    async handleSubmit() {
        try {
            const formData = new FormData(this.loanForm);
            const data = Object.fromEntries(formData);
            
            // 데이터 정제
            if (data.amount === '') {
                data.amount = null;
            } else {
                data.amount = parseInt(data.amount.replace(/[^0-9]/g, ''));
            }
            
            Object.keys(data).forEach(key => {
                if (data[key] === '') {
                    data[key] = null;
                }
            });
    
            // 데이터 저장
            const response = await window.authUtils.fetchWithAuth(
                this.currentLoanId 
                    ? `${this.endpoints.base}${this.currentLoanId}/`
                    : this.endpoints.base,
                {
                    method: this.currentLoanId ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );
    
            // 새로운 데이터 전체 다시 불러오기
            const result = await window.authUtils.fetchWithAuth(this.endpoints.base);
            console.log('Updated loans response:', result);  // 응답 구조 확인
            
            // API 응답 구조에 따라 배열 추출
            const updatedLoans = Array.isArray(result) ? result : result.prior_loans || [];
            
            // 전역 상태 업데이트
            window.loanCaseApp.priorLoans = updatedLoans;
            
            // UI 업데이트
            await this.renderLoansTable();
            this.closeModal();
            window.authUtils.showToast('성공', '선순위대출 정보가 저장되었습니다.', 'success');
            
        } catch (error) {
            console.error('Submit error:', error);
            window.authUtils.showToast('에러', error.message, 'error');
        }
    }

    async deleteLoan(loanId) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        
        try {
            // 삭제 요청
            await window.authUtils.fetchWithAuth(
                `${this.endpoints.base}${loanId}/`,
                { method: 'DELETE' }
            );
    
            // 새로운 데이터 전체 다시 불러오기
            const result = await window.authUtils.fetchWithAuth(this.endpoints.base);
            
            // API 응답 구조에 따라 배열 추출
            const updatedLoans = Array.isArray(result) ? result : result.prior_loans || [];
            
            // 전역 상태 업데이트
            window.loanCaseApp.priorLoans = updatedLoans;
                
            // UI 업데이트
            await this.renderLoansTable();
            window.authUtils.showToast('성공', '선순위대출이 삭제되었습니다.', 'success');
            
        } catch (error) {
            window.authUtils.showToast('에러', error.message, 'error');
        }
    }

    populateForm(loan) {
        if (!this.loanForm) return;

        Object.entries(loan).forEach(([key, value]) => {
            const input = this.loanForm.elements[key];
            if (!input) return;

            if (key === 'amount') {
                input.value = formatAmount(value);
            } else {
                input.value = value || '';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loanManager = new PriorLoanManager();
    loanManager.initialize();
});

export default PriorLoanManager;