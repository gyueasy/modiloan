// static/js/modal.js

// Security Provider 모달 관련 기능
let securityProviderModal;
let securityProviderForm;
let eventModal;
let eventForm;
let priorLoanModal;
let priorLoanForm;

// Security Provider 모달 열기
function openSecurityProviderModal(index = null) {
    console.log('openSecurityProviderModal called');

    if (!securityProviderModal || !securityProviderForm) {
        securityProviderModal = document.getElementById('securityProviderModal');
        securityProviderForm = document.getElementById('securityProviderForm');

        if (!securityProviderModal || !securityProviderForm) {
            console.error('Modal or form not found');
            return;
        }
    }

    // 폼 초기화
    securityProviderForm.reset();
    document.getElementById('providerIndex').value = '';

    // 수정 모드인 경우 데이터 채우기
    if (index !== null) {
        console.log(`Editing security provider at index ${index}`);
        const provider = securityProviders[index];
        document.getElementById('providerIndex').value = index;
        document.getElementById('providerName').value = provider.name;
        document.getElementById('providerBirthDate').value = provider.birth_date;
        document.getElementById('providerPhone').value = provider.phone;
        document.getElementById('providerCreditScore').value = provider.credit_score;
    }

    securityProviderModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
}

// Security Provider 모달 닫기
function closeSecurityProviderModal() {
    console.log('closeSecurityProviderModal called');

    if (securityProviderModal) {
        securityProviderModal.classList.add('hidden');
        document.body.style.overflow = ''; // 스크롤 복구
    }
}

// Prior Loan 모달 열기
function openPriorLoanModal(index = null) {
    console.log('openPriorLoanModal called');

    if (!priorLoanModal || !priorLoanForm) {
        priorLoanModal = document.getElementById('priorLoanModal');
        priorLoanForm = document.getElementById('priorLoanForm');

        if (!priorLoanModal || !priorLoanForm) {
            console.error('Modal or form not found');
            return;
        }
    }

    // 폼 초기화
    priorLoanForm.reset();
    document.getElementById('loanIndex').value = '';

    // 수정 모드인 경우 데이터 채우기
    if (index !== null) {
        console.log(`Editing prior loan at index ${index}`);
        const loan = priorLoans[index];
        document.getElementById('loanIndex').value = index;
        document.getElementById('loanType').value = loan.loan_type;
        document.getElementById('financialCompany').value = loan.financial_company;
        document.getElementById('loanAmount').value = loan.amount;
    }

    priorLoanModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Prior Loan 모달 닫기
function closePriorLoanModal() {
    console.log('closePriorLoanModal called');

    if (priorLoanModal) {
        priorLoanModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Event 모달 열기
function openEventModal(eventData = null) {
    console.log('openEventModal called');

    if (!eventModal || !eventForm) {
        eventModal = document.getElementById('eventModal');
        eventForm = document.getElementById('eventForm');

        if (!eventModal || !eventForm) {
            console.error('Event modal or form not found');
            return;
        }
    }

    // 폼 초기화
    eventForm.reset();
    document.getElementById('eventId').value = '';

    // 수정 모드인 경우 데이터 채우기
    if (eventData) {
        console.log('Editing event:', eventData);
        document.getElementById('eventId').value = eventData.id;
        document.getElementById('title').value = eventData.title;
        document.getElementById('description').value = eventData.description || '';
        document.getElementById('authorizing_date').value = eventData.authorizing_date || '';
        document.getElementById('journalizing_date').value = eventData.journalizing_date || '';
        document.getElementById('scheduled_date').value = eventData.scheduled_date || '';
    }

    eventModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Event 모달 닫기
function closeEventModal() {
    console.log('closeEventModal called');

    if (eventModal) {
        eventModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// 모달 외부 클릭 시 닫기 & 초기화
document.addEventListener('DOMContentLoaded', function () {
    // Security Provider Modal
    securityProviderModal = document.getElementById('securityProviderModal');
    if (securityProviderModal) {
        securityProviderModal.addEventListener('click', function (e) {
            if (e.target === securityProviderModal) {
                closeSecurityProviderModal();
            }
        });
    }

    // Prior Loan Modal
    priorLoanModal = document.getElementById('priorLoanModal');
    if (priorLoanModal) {
        priorLoanModal.addEventListener('click', function (e) {
            if (e.target === priorLoanModal) {
                closePriorLoanModal();
            }
        });
    }

    // Event Modal
    eventModal = document.getElementById('eventModal');
    if (eventModal) {
        eventModal.addEventListener('click', function (e) {
            if (e.target === eventModal) {
                closeEventModal();
            }
        });
    }

    // 닫기 버튼들 이벤트 연결
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', function () {
            const modal = this.closest('.modal');
            if (modal) {
                if (modal.id === 'securityProviderModal') closeSecurityProviderModal();
                else if (modal.id === 'priorLoanModal') closePriorLoanModal();
                else if (modal.id === 'eventModal') closeEventModal();
            }
        });
    });
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        if (eventModal && !eventModal.classList.contains('hidden')) {
            closeEventModal();
        } else if (securityProviderModal && !securityProviderModal.classList.contains('hidden')) {
            closeSecurityProviderModal();
        } else if (priorLoanModal && !priorLoanModal.classList.contains('hidden')) {
            closePriorLoanModal();
        }
    }
});

// 전역으로 함수들 내보내기
window.openSecurityProviderModal = openSecurityProviderModal;
window.closeSecurityProviderModal = closeSecurityProviderModal;
window.openPriorLoanModal = openPriorLoanModal;
window.closePriorLoanModal = closePriorLoanModal;
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;