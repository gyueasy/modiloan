// security_provider.js
import { formatPhoneNumber } from './utils.js';

class SecurityProviderManager {
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
            console.log('SecurityProviderManager initialized with caseId:', this.loanCaseId);

            this.initializeDOMElements();
            this.initializeEndpoints();
            this.setupEventListeners();
            await this.renderProvidersTable();

            this.isInitialized = true;
        } catch (error) {
            window.authUtils.showToast('초기화 실패', error.message, 'error');
        }
    }

    initializeDOMElements() {
        this.providersTable = document.getElementById('providersTable');
        this.addProviderBtn = document.getElementById('addProviderBtn');
        this.providerModal = document.getElementById('providerModal');
        this.providerForm = document.getElementById('providerForm');
        this.currentProviderId = null;
    }

    initializeEndpoints() {
        this.endpoints = {
            base: `/api/cases/${this.loanCaseId}/providers/`
        };
    }

    setupEventListeners() {
        this.addProviderBtn?.addEventListener('click', () => this.openModal());
    
        // 하나의 submit 이벤트 리스너만 유지
        this.providerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    
        const phoneInput = this.providerForm?.querySelector('[name="phone"]');
        phoneInput?.addEventListener('input', (e) => {
            e.target.value = formatPhoneNumber(e.target.value);
        });
    
        const birthInput = this.providerForm?.querySelector('[name="birth_date"]');
        birthInput?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    
        // 모달 닫기 이벤트
        const closeButtons = this.providerModal?.querySelectorAll('[data-dismiss="modal"]');
        closeButtons?.forEach(button => {
            button.addEventListener('click', () => this.closeModal());
        });
    }

    async renderProvidersTable() {
        if (!this.providersTable) return;

        const providers = window.loanCaseApp.securityProviders || [];
        console.log('Rendering providers:', providers);

        this.providersTable.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생년월일</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신용점수</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관계</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${providers.length > 0
                ? providers.map(provider => this.renderProviderRow(provider)).join('')
                : `<tr>
                            <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                                등록된 담보제공자가 없습니다.
                            </td>
                        </tr>`
            }
                </tbody>
            </table>
        `;

        // 이벤트 리스너 바인딩
        const editButtons = this.providersTable.querySelectorAll('.edit-provider');
        const deleteButtons = this.providersTable.querySelectorAll('.delete-provider');

        console.log('Found edit buttons:', editButtons.length);
        console.log('Found delete buttons:', deleteButtons.length);

        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Edit clicked:', btn.dataset.id);
                this.openModal(btn.dataset.id);
            });
        });

        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Delete clicked:', btn.dataset.id);
                this.deleteProvider(btn.dataset.id);
            });
        });
    }

    renderProviderRow(provider) {
        const relationshipTypes = {
            'spouse': '배우자',
            'parent': '부모님',
            'sibling': '형제/자매',
            'child': '자녀',
            'other': '기타'
        };
    
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${provider.name}</td>
                <td class="px-6 py-4 whitespace-nowrap">${provider.birth_date || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${provider.phone || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${provider.credit_score || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${relationshipTypes[provider.relationship_type] || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <button type="button" 
                            class="edit-provider text-blue-600 hover:text-blue-900 mr-3"
                            data-id="${provider.id}">
                        수정
                    </button>
                    <button type="button" 
                            class="delete-provider text-red-600 hover:text-red-900"
                            data-id="${provider.id}">
                        삭제
                    </button>
                </td>
            </tr>
        `;
    }

    async openModal(providerId = null) {
        this.currentProviderId = providerId;
    
        if (providerId) {
            try {
                const response = await window.authUtils.fetchWithAuth(
                    `${this.endpoints.base}${providerId}/`
                );
    
                // response.provider로 데이터가 오는지 확인
                const provider = response.provider || response;
                console.log('Provider data:', provider);
                
                this.populateForm(provider);
            } catch (error) {
                console.error('Error fetching provider:', error);
                window.authUtils.showToast('에러', '담보제공자 정보를 불러오는데 실패했습니다.', 'error');
                return;
            }
        } else {
            this.providerForm?.reset();
        }
    
        this.providerModal?.classList.remove('hidden');
    }

    closeModal() {
        this.providerModal?.classList.add('hidden');
        this.currentProviderId = null;
        this.providerForm?.reset();
    }

    async handleSubmit() {
        try {
            const formData = new FormData(this.providerForm);
            const data = {
                loan_case: this.loanCaseId,  // loan_case ID 추가
                name: formData.get('name'),
                birth_date: formData.get('birth_date') || null,
                phone: formData.get('phone') || null,
                credit_score: formData.get('credit_score') ? 
                    parseInt(formData.get('credit_score')) : null,
                relationship_type: formData.get('relationship_type') || null
            };
    
            // 데이터 검증
            if (!data.name) {
                throw new Error('이름은 필수 입력 항목입니다.');
            }
    
            console.log('Submitting provider data:', data);
    
            // 저장 요청
            const saveResponse = await window.authUtils.fetchWithAuth(
                this.currentProviderId
                    ? `${this.endpoints.base}${this.currentProviderId}/`
                    : this.endpoints.base,
                {
                    method: this.currentProviderId ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );
    
            console.log('Save Response:', saveResponse);
    
            // 전체 목록 다시 불러오기
            const updatedData = await window.authUtils.fetchWithAuth(this.endpoints.base);
            console.log('Updated data:', updatedData);
    
            // providers 배열 추출
            const updatedProviders = updatedData.providers || [];
            console.log('Providers to update:', updatedProviders);
    
            // 전역 상태 업데이트
            window.loanCaseApp.securityProviders = updatedProviders;
    
            // UI 업데이트
            await this.renderProvidersTable();
    
            this.closeModal();
            window.authUtils.showToast('성공', '담보제공자 정보가 저장되었습니다.', 'success');
    
        } catch (error) {
            console.error('Submit error:', error);
            window.authUtils.showToast('에러', error.message, 'error');
        }
    }

    async deleteProvider(providerId) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
    
        try {
            // 삭제 요청
            await window.authUtils.fetchWithAuth(
                `${this.endpoints.base}${providerId}/`,
                { method: 'DELETE' }
            );
    
            // 새로운 데이터 다시 불러오기
            const result = await window.authUtils.fetchWithAuth(this.endpoints.base);
    
            // API 응답 구조 수정
            const updatedProviders = result.providers || [];  // 수정된 부분
    
            // 전역 상태 업데이트
            window.loanCaseApp.securityProviders = updatedProviders;
    
            // UI 업데이트
            await this.renderProvidersTable();
            window.authUtils.showToast('성공', '담보제공자가 삭제되었습니다.', 'success');
    
        } catch (error) {
            window.authUtils.showToast('에러', error.message, 'error');
        }
    }

    populateForm(provider) {
        if (!this.providerForm) return;
    
        Object.entries(provider).forEach(([key, value]) => {
            const input = this.providerForm.elements[key];
            if (input) {
                // select 요소인 경우 value 설정
                if (input.tagName === 'SELECT') {
                    input.value = value || '';
                } else {
                    input.value = value || '';
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const providerManager = new SecurityProviderManager();
    providerManager.initialize();
});

export default SecurityProviderManager;