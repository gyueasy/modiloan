class CaseDetailManager {
    constructor() {
        // URL에서 case_id 추출 (/web/cases/1/ 형식에서)
        const pathParts = window.location.pathname.split('/');
        const caseId = pathParts[pathParts.indexOf('cases') + 1];

        if (!caseId) {
            console.error('Case ID not found in URL');
            window.authUtils.showToast('에러', '케이스 ID를 찾을 수 없습니다.', 'error');
            return;
        }

        // window.loanCaseApp 초기화 또는 업데이트
        window.loanCaseApp = {
            ...(window.loanCaseApp || {}),
            caseId: caseId,
            saveTimer: null,
            securityProviders: [],
            priorLoans: [],
            comments: [],
            consultingLogs: [],
            events: [],
            initialized: false,
            endpoints: {
                base: `/api/cases/${caseId}/`,
                comments: `/api/cases/${caseId}/comments/`,
                consultingLogs: `/api/cases/${caseId}/consulting-logs/`
            }
        };

        this.loanCaseId = caseId;
        this.isInitialized = false;
        console.log('Constructed with caseId:', this.loanCaseId);
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('Already initialized, skipping...');
            return;
        }

        console.group('CaseDetailManager Initialization');
        try {
            console.log('[1] Starting initialization...');
            await this.waitForDOM();
            console.log('[2] DOM ready');

            this.initializeEndpoints();
            console.log('[3] Endpoints initialized');

            this.initializeDOMElements();
            console.log('[4] DOM elements initialized');

            await this.loadInitialData();
            console.log('[5] Initial data loaded');

            // 여기로 이동
            window.loanCaseApp.initialized = true;
            console.log('[6] App initialization flag set');
            document.dispatchEvent(new Event('appInitialized'));
            console.log('[7] App initialized event dispatched');

            await this.initializeManagers();
            console.log('[8] Managers initialized');

            this.setupEventListeners();
            console.log('[9] Event listeners setup complete');

            this.isInitialized = true;
            console.log('[10] Case detail manager initialization complete');

        } catch (error) {
            console.error('Initialization failed:', error);
            window.authUtils.showToast('에러', '초기화 중 오류가 발생했습니다.', 'error');
            throw error;
        } finally {
            console.groupEnd();
        }
    }

    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                console.log('DOM is already loaded');
                resolve();
            } else {
                console.log('Waiting for DOM to load...');
                window.addEventListener('load', () => {
                    console.log('DOM load event fired');
                    resolve();
                });
            }
        });
    }

    initializeEndpoints() {
        const baseUrl = '/api/cases';

        this.endpoints = {
            detail: `${baseUrl}/${this.loanCaseId}/`,
            update: `${baseUrl}/${this.loanCaseId}/update/`,
            status: `${baseUrl}/${this.loanCaseId}/status/`,
            urgent: `${baseUrl}/${this.loanCaseId}/urgent/`,
            comments: `${baseUrl}/${this.loanCaseId}/comments/`,
            consultingLogs: `${baseUrl}/${this.loanCaseId}/consulting-logs/`,
        };

        console.log('Initialized Endpoints:', {
            baseUrl,
            caseId: this.loanCaseId,
            endpoints: this.endpoints
        });
    }

    async initializeManagers() {
        console.group('Manager Initialization');
        try {
            // 앱 초기화 플래그 먼저 설정
            window.loanCaseApp.initialized = true;
            console.log('[1] App initialization flag set');

            document.dispatchEvent(new Event('appInitialized'));
            console.log('[2] App initialized event dispatched');

            // 그 다음 매니저들 초기화
            console.log('[3] Starting manager initialization sequence');

            console.log('[4] Loading Comment Manager module');
            const CommentManager = (await import('./comment.js')).default;
            console.log('[5] Comment Manager module loaded');
            this.commentManager = new CommentManager();
            await this.commentManager.initialize();

            console.log('[6] Loading ConsultingLog Manager module');
            const ConsultingLogManager = (await import('./consulting_log.js')).default;
            console.log('[7] ConsultingLog Manager module loaded');
            this.consultingLogManager = new ConsultingLogManager();
            await this.consultingLogManager.initialize();

            console.log('[8] Loading Event Manager module');
            const EventManager = (await import('./event.js')).default;
            console.log('[9] Event Manager module loaded');
            this.eventManager = new EventManager();
            await this.eventManager.initialize();

            console.log('[10] All managers initialized successfully');

        } catch (error) {
            console.error('Manager initialization failed:', error);
            window.authUtils.showToast('에러', '일부 기능을 초기화하지 못했습니다.', 'error');
            throw error;
        } finally {
            console.groupEnd();
        }
    }

    initializeDOMElements() {
        console.group('DOM Element Initialization');
        console.log('Document ready state:', document.readyState);

        // form 찾기
        const form = document.getElementById('caseForm');
        console.log('Found form element:', form);
        console.log('Form HTML:', form?.outerHTML);

        if (!form) {
            console.error('Form element missing');
            console.log('All forms on page:', document.forms);
            console.log('Current page HTML:', document.body.innerHTML);
            throw new Error('Required form element not found');
        }

        this.form = form;

        // 이벤트 리스너 바인딩
        console.log('Adding event listeners to form');
        const boundHandleFormChange = this.handleFormChange.bind(this);  // this 바인딩 추가
        this.form.addEventListener('change', boundHandleFormChange);
        this.form.addEventListener('input', boundHandleFormChange);

        // 나머지 DOM 요소들 초기화
        this.statusSelect = document.getElementById('statusSelect');
        this.urgentToggle = document.getElementById('urgentToggle');
        this.borrowerNameInput = document.getElementById('borrowerName');
        this.borrowerPhoneInput = document.getElementById('borrowerPhone');
        this.borrowerBirthInput = document.getElementById('borrowerBirth');
        this.providersTable = document.getElementById('providersTable');
        this.priorLoansTable = document.getElementById('priorLoansTable');
        this.addProviderBtn = document.getElementById('addProviderBtn');
        this.addPriorLoanBtn = document.getElementById('addPriorLoanBtn');

        if (this.statusSelect) {
            this.previousStatus = this.statusSelect.value;
        }

        console.log('DOM Elements initialized:', {
            form: !!this.form,
            statusSelect: !!this.statusSelect,
            urgentToggle: !!this.urgentToggle,
            borrowerNameInput: !!this.borrowerNameInput,
            providersTable: !!this.providersTable,
            priorLoansTable: !!this.priorLoansTable
        });
        console.groupEnd();
    }

    setupEventListeners() {

        this.addProviderBtn?.addEventListener('click', () => {
            const modal = document.getElementById('providerModal');
            if (modal) modal.classList.remove('hidden');
        });

        this.addPriorLoanBtn?.addEventListener('click', () => {
            const modal = document.getElementById('priorLoanModal');
            if (modal) modal.classList.remove('hidden');
        });

        // this.providersTable?.addEventListener('click', e => {
        //     const button = e.target.closest('button');
        //     if (!button) return;

        //     const id = button.dataset.id;
        //     if (button.classList.contains('edit-provider')) {
        //         this.editProvider(id);
        //     } else if (button.classList.contains('delete-provider')) {
        //         this.deleteProvider(id);
        //     }
        // });

        this.priorLoansTable?.addEventListener('click', e => {
            const button = e.target.closest('button');
            if (!button) return;

            const id = button.dataset.id;
            if (button.classList.contains('edit-loan')) {
                this.editPriorLoan(id);
            } else if (button.classList.contains('delete-loan')) {
                this.deletePriorLoan(id);
            }
        });
        // 이벤트 모달도 동일한 패턴으로 수정

        // Status 변경 이벤트 리스너 추가
        if (this.statusSelect) {
            this.statusSelect.addEventListener('change', (e) => this.handleStatusChange(e));
        }
    }
    async loadInitialData() {
        try {
            if (!window.loanCaseApp.caseId) {
                throw new Error('Case ID not found');
            }
    
            if (!this.form) {
                throw new Error('Form not initialized');
            }
    
            const data = await window.authUtils.fetchWithAuth(this.endpoints.detail);
            console.log('Initial fetch data:', data);  // 이제 data 선언 후에 사용
            this.populateFormData(data);

            console.log('After set borrowerName:', window.loanCaseApp); // 로그 추가

            console.log('Fetching comments from:', this.endpoints.comments);
            const commentsResponse = await window.authUtils.fetchWithAuth(this.endpoints.comments);
            console.log('Comments API Response:', commentsResponse);

            console.log('Fetching consulting logs from:', this.endpoints.consultingLogs);
            const logsResponse = await window.authUtils.fetchWithAuth(this.endpoints.consultingLogs);
            console.log('ConsultingLogs API Response:', logsResponse);

            window.loanCaseApp.securityProviders = data.security_providers || [];
            window.loanCaseApp.priorLoans = data.prior_loans || [];

        } catch (error) {
            console.error('Initial data load error:', error);
            window.authUtils.showToast('에러', '데이터를 불러오는데 실패했습니다.', 'error');
            throw error;
        }
    }

    async loadEvents() {
        try {
            console.log('Loading events from:', this.endpoints.events);
            const response = await window.authUtils.fetchWithAuth(this.endpoints.events);

            // eventList 초기화
            if (this.eventList) {
                this.eventList.innerHTML = '';
            }

            console.log('Events response:', response);
            if (response && (Array.isArray(response) || Array.isArray(response.results))) {
                const events = Array.isArray(response) ? response : response.results;
                events.forEach(event => {
                    console.log('Populating event:', event);
                    this.populateEvent(event);
                });
            }
        } catch (error) {
            console.error('이벤트 불러오기 오류:', error);
            window.authUtils.showToast('오류', '이벤트를 불러오는데 실패했습니다.', 'error');
        }
    }

    async handleStatusChange(event) {
        const newStatus = event.target.value;

        try {
            console.log('Updating status to:', newStatus);

            const response = await window.authUtils.fetchWithAuth(this.endpoints.status, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: newStatus,
                    case_id: window.loanCaseApp.caseId
                })
            });

            console.log('Status update response:', response);
            window.authUtils.showToast('성공', '상태가 변경되었습니다.', 'success');
            this.previousStatus = newStatus;

        } catch (error) {
            console.error('Status update error:', error);
            window.authUtils.showToast('에러', error.message, 'error');
            if (this.statusSelect) {
                this.statusSelect.value = this.previousStatus;
            }
        }
    }

    async handleUrgentToggle() {
        try {
            const response = await window.authUtils.fetchWithAuth(this.endpoints.urgent, {
                method: 'PATCH'
            });

            this.urgentToggle.classList.toggle('bg-red-100');
            this.urgentToggle.classList.toggle('text-red-700');
            this.urgentToggle.classList.toggle('bg-gray-100');
            this.urgentToggle.classList.toggle('text-gray-700');

            window.authUtils.showToast('성공', response.message, 'success');

        } catch (error) {
            window.authUtils.showToast('에러', error.message, 'error');
        }
    }

    handleFormChange() {
        console.group('Form Change Handler');
        console.log('Form exists?', !!this.form);
        console.log('Is initialized?', this.isInitialized);
        console.log('this context:', this);

        if (!this.form || !this.isInitialized) {
            console.warn('Form not ready for changes');
            console.groupEnd();
            return;
        }

        if (window.loanCaseApp.saveTimer) {
            console.log('Clearing existing save timer');
            clearTimeout(window.loanCaseApp.saveTimer);
        }

        console.log('Setting new save timer');
        window.loanCaseApp.saveTimer = setTimeout(() => {
            this.saveFormData();
        }, 1000);
        console.groupEnd();
    }

    async saveFormData() {
        if (!this.form || !this.isInitialized) {
            console.error('Form not initialized');
            return;
        }
    
        try {
            const cleanData = {};
            const formData = new FormData(this.form);
    
            // 새로 추가된 필드들
            const newFields = [
                'introducer', 
                'loan_type', 
                'business_number', 
                'business_category', 
                'business_item', 
                'is_tenant',
                'referrer'  // referrer 추가
            ];
    
            for (const [key, value] of formData.entries()) {
                // 빈 값이 아니거나 새로 추가된 필드인 경우 포함
                if (value !== '' || newFields.includes(key)) {
                    cleanData[key] = value;
                }
            }
    
            // 체크박스 필드 처리
            this.form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                cleanData[checkbox.name] = checkbox.checked;
            });
    
            // 대출 유형과 새로 추가된 필드들 명시적으로 처리
            newFields.forEach(field => {
                const element = this.form.elements[field];
                if (element) {
                    if (field === 'is_tenant') {
                        cleanData[field] = element.checked;
                    } else {
                        // 빈 문자열이면 null로 처리
                        cleanData[field] = element.value.trim() || null;
                    }
                }
            });
    
            console.log('Saving form data:', cleanData);
    
            const response = await window.authUtils.fetchWithAuth(
                this.endpoints.update,
                {
                    method: 'PUT',
                    body: JSON.stringify(cleanData)
                }
            );
    
            if (response && response.loan_case) {
                this.populateFormData(response);
                window.authUtils.showToast('성공', '데이터가 저장되었습니다.', 'success');
            } else {
                throw new Error('저장된 데이터를 받지 못했습니다.');
            }
    
        } catch (error) {
            console.error('Save error:', error);
            window.authUtils.showToast('에러', '데이터 저장 중 오류가 발생했습니다.', 'error');
        }
    }

    populateFormData(data) {
        console.log('Received data:', data);
        
        if (!data.loan_case) return;
        
        const headerTitle = document.querySelector('h1');
        if (headerTitle) {
            headerTitle.textContent = data.loan_case.borrower_name ?
                `${data.loan_case.borrower_name}님의 대출 건` : '신규 대출 건';
        }
        
        if (this.statusSelect && data.status_choices) {
            this.statusSelect.innerHTML = '';
            Object.entries(data.status_choices).forEach(([value, label]) => {
                const option = new Option(label, value);
                this.statusSelect.add(option);
            });
            
            if (data.loan_case.status) {
                this.statusSelect.value = data.loan_case.status;
                this.previousStatus = data.loan_case.status;
            }
        }
        
        if (data.security_providers) {
            this.renderSecurityProviders(data.security_providers);
        }
        if (data.prior_loans) {
            this.renderPriorLoans(data.prior_loans);
        }
        
        if (this.urgentToggle) {
            if (data.loan_case.is_urgent) {
                this.urgentToggle.classList.add('bg-red-100', 'text-red-700');
                this.urgentToggle.classList.remove('bg-gray-100', 'text-gray-700');
            } else {
                this.urgentToggle.classList.add('bg-gray-100', 'text-gray-700');
                this.urgentToggle.classList.remove('bg-red-100', 'text-red-700');
            }
        }
        
        const formElements = this.form.elements;
        
        // 새로 추가된 필드들 포함
        const newFields = [
            'introducer', 
            'loan_type', 
            'business_number', 
            'business_category', 
            'business_item', 
            'is_tenant'
        ];
        
        Object.entries(data.loan_case).forEach(([key, value]) => {
            const element = formElements[key];
            if (!element) return;
            
            if (element.type === 'checkbox') {
                element.checked = Boolean(value);
            } else if (element.type === 'select-one' && value === null) {
                element.selectedIndex = 0;
            } else {
                // 새로 추가된 필드들도 처리
                if (newFields.includes(key)) {
                    element.value = value ?? '';
                } else {
                    element.value = value ?? '';
                }
            }
        });
        
        this.populateSelectOptions('business_type', data.business_type_choices, data.loan_case.business_type);
        this.populateSelectOptions('vat_status', data.vat_status_choices, data.loan_case.vat_status);
        this.populateSelectOptions('price_type', data.price_type_choices, data.loan_case.price_type);
        
        // 새로 추가된 대출 유형 셀렉트 옵션
        const loanTypeSelect = this.form.elements['loan_type'];
        if (loanTypeSelect && data.loan_case.loan_type) {
            loanTypeSelect.value = data.loan_case.loan_type;
        }
    }

    populateSelectOptions(elementName, choices, selectedValue) {
        const selectElement = this.form.elements[elementName];
        if (!selectElement) return;

        selectElement.innerHTML = '';

        Object.entries(choices).forEach(([value, label]) => {
            const option = new Option(label, value);
            selectElement.add(option);
        });

        if (selectedValue) {
            selectElement.value = selectedValue;
        }
    }

    renderSecurityProviders(providers) {
        if (!this.providersTable) return;

        this.providersTable.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관계</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${providers.map(provider => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">${provider.name || '-'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${provider.phone || '-'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${provider.relationship_type || '-'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button class="text-indigo-600 hover:text-indigo-900 edit-provider" data-id="${provider.id}">수정</button>
                                <button class="text-red-600 hover:text-red-900 ml-4 delete-provider" data-id="${provider.id}">삭제</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderPriorLoans(loans) {
        if (!this.priorLoansTable) return;

        this.priorLoansTable.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대출종류</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금융기관</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${loans.map(loan => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">${loan.loan_type || '-'}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${loan.financial_company || '-'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right">${loan.formatted_amount || '-'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button class="text-indigo-600 hover:text-indigo-900 edit-loan" data-id="${loan.id}">수정</button>
                                <button class="text-red-600 hover:text-red-900 ml-4 delete-loan" data-id="${loan.id}">삭제</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// DOM이 완전히 로드된 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing CaseDetailManager');
    const caseDetail = new CaseDetailManager();
    caseDetail.initialize();
});

export default CaseDetailManager;