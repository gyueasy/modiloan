// consulting_log.js

class ConsultingLogManager {
    constructor() {
        this.logs = [];
        this.isInitialized = false;
        this.eventListenersAttached = false;
        this.isLoading = false;

        // Singleton 패턴 적용
        if (window.consultingLogManager) {
            return window.consultingLogManager;
        }
        window.consultingLogManager = this;
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
        console.group('ConsultingLog Manager Initialize');
        try {
            if (this.isInitialized) {
                console.log('Already initialized, skipping...');
                return;
            }

            // DOM 요소 초기화 전 로그
            console.log('Starting ConsultingLog Manager initialization');

            this.initializeDOMElements();
            console.log('DOM elements:', {
                form: this.logForm,
                list: this.logList,
                content: this.logContent
            });

            this.initializeEndpoints();
            console.log('Endpoints initialized:', this.endpoints);

            this.setupEventListeners();
            console.log('Event listeners set up');

            // 데이터 로드
            console.log('Loading initial logs...');
            await this.loadLogs();

            this.isInitialized = true;
            console.log('ConsultingLog manager initialization complete');
            return true;
        } catch (error) {
            console.error('ConsultingLog manager initialization failed:', error);
            throw error;
        } finally {
            console.groupEnd();
        }
    }

    initializeDOMElements() {
        console.group('ConsultingLogManager DOM Elements');
        this.logContainer = document.getElementById('consultingLogs');
        this.logForm = document.getElementById('consultingLogForm');
        this.logContent = document.getElementById('logContent');
        this.logList = document.getElementById('logList');

        console.log({
            container: this.logContainer,
            form: this.logForm,
            content: this.logContent,
            list: this.logList
        });
        console.groupEnd();

        // DOM 요소가 없으면 초기화 중단해야 함
        if (!this.logList || !this.logForm) {
            throw new Error('Required DOM elements for consulting logs not found');
        }
    }

    initializeEndpoints() {
        const baseUrl = `/api/cases/${window.loanCaseApp.caseId}/consulting-logs`;  // 마지막 슬래시 제거
        this.endpoints = {
            list: baseUrl + '/',
            detail: (logId) => `${baseUrl}/${logId}/`
        };
    }

    setupEventListeners() {
        if (this.eventListenersAttached) return;

        this.logForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        this.logList?.addEventListener('click', (e) => {
            if (e.target.matches('.delete-log-btn')) {
                const logId = e.target.dataset.id;
                this.deleteLog(logId);
            }
        });

        this.eventListenersAttached = true;
    }

    async loadLogs() {
        try {
            console.log('Loading logs from:', this.endpoints.list);
            const response = await window.authUtils.fetchWithAuth(this.endpoints.list);
            console.log('Logs loaded:', response);

            if (response?.consulting_logs) {
                this.logs = response.consulting_logs;
                console.log('Logs array:', this.logs);
                await this.renderLogs();
            }
        } catch (error) {
            console.error('Failed to load logs:', error);
        }
    }

    renderLogs() {
        console.log('Starting to render logs');
        if (!this.logList) {
            console.error('Log list element not found');
            return;
        }

        this.logList.innerHTML = '';
        if (this.logs && this.logs.length > 0) {
            this.logs.forEach(log => {
                const html = this.renderLogItem(log);
                console.log('Rendered log HTML:', html);
                this.logList.insertAdjacentHTML('beforeend', html);
            });
            console.log('Logs rendering complete');
        } else {
            console.log('No logs to render');
        }
    }

    renderLogItem(log) {
        console.log('Rendering log item:', log);
        return `
            <div class="log-item border-b border-gray-200 py-3">
                <div class="flex justify-between items-start">
                    <div class="text-sm text-gray-600">
                        <span class="font-medium">${log.created_by || '익명'}</span>
                        <span class="mx-2">·</span>
                        <time>${new Date(log.created_at).toLocaleString()}</time>
                    </div>
                    <button class="delete-log-btn text-red-600 text-sm" data-id="${log.id}">삭제</button>
                </div>
                <div class="mt-2">${log.content}</div>
            </div>
        `;
    }


    async handleSubmit() {
        if (!this.logContent?.value.trim()) {
            window.authUtils.showToast('알림', '내용을 입력해주세요.', 'error');
            return;
        }

        try {
            const response = await window.authUtils.fetchWithAuth(this.endpoints.list, {
                method: 'POST',
                body: JSON.stringify({
                    content: this.logContent.value.trim()
                })
            });

            // 새 로그 추가 후 전체 목록 다시 로드
            await this.loadLogs();

            this.logContent.value = '';

            window.authUtils.showToast('성공', '상담일지가 저장되었습니다.', 'success');
        } catch (error) {
            window.authUtils.showToast('에러', error.message, 'error');
        }
    }

    async deleteLog(logId) {
        try {
            await window.authUtils.fetchWithAuth(this.endpoints.detail(logId), {
                method: 'DELETE',
            });

            window.authUtils.showToast('성공', '상담일지가 삭제되었습니다.', 'success');

            this.logs = this.logs.filter(log => log.id !== parseInt(logId));
            this.renderLogs();
        } catch (error) {
            console.error('Failed to delete log:', error);
            window.authUtils.showToast('에러', error.message || '상담일지를 삭제하지 못했습니다.', 'error');
        }
    }
}

// 초기화 코드
document.addEventListener('DOMContentLoaded', () => {
    const consultingLogManager = new ConsultingLogManager();
    consultingLogManager.initialize();
});

export default ConsultingLogManager;