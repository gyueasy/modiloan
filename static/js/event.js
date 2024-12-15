class EventManager {
    constructor() {
        this.events = [];
        this.isInitialized = false;
        this.eventListenersAttached = false;
        this.isLoading = false;

        // 싱글톤 패턴 적용
        if (window.eventManager) {
            return window.eventManager;
        }
        window.eventManager = this;
    }

    waitForApp() {
        return new Promise((resolve) => {
            if (window.loanCaseApp?.initialized) {
                console.log('App is already initialized');
                resolve();
            } else {
                document.addEventListener('appInitialized', () => {
                    console.log('App initialization event received');
                    resolve();
                }, { once: true });
            }
        });
    }

    async initialize() {
        console.group('Event Manager Initialize');
        try {
            if (this.isInitialized) {
                console.log('Already initialized, skipping...');
                return;
            }

            console.log('Starting Event Manager initialization');

            this.loanCaseId = window.loanCaseApp?.caseId;
            if (!this.loanCaseId) {
                throw new Error('Case ID not found');
            }

            this.initializeDOMElements();
            console.log('DOM elements initialized');

            this.initializeEndpoints();
            console.log('Endpoints initialized');

            this.setupEventForm();  // 여기에 추가
            console.log('Event form setup complete');

            this.setupEventListeners();
            console.log('Event listeners set up');

            console.log('Loading initial events...');
            await this.renderEvents();

            this.isInitialized = true;
            console.log('Event manager initialization complete');
            return true;
        } catch (error) {
            console.error('Event manager initialization failed:', error);
            throw error;
        } finally {
            console.groupEnd();
        }
    }


    initializeDOMElements() {
        this.eventList = document.getElementById('eventList');
        this.addEventBtn = document.getElementById('addEventBtn');
        this.eventModal = document.getElementById('eventModal');
        this.eventForm = document.getElementById('eventForm');
        this.currentEventId = null;

        if (!this.eventList || !this.addEventBtn || !this.eventModal || !this.eventForm) {
            throw new Error('Required DOM elements for events not found');
        }
    }

    initializeEndpoints() {
        this.endpoints = {
            base: `/api/cases/${this.loanCaseId}/events/`,
            create: '/api/events/create/',
            detail: (id) => `/api/events/${id}/`,
            list: '/api/events/'
        };
    }

    setupEventListeners() {
        if (this.eventListenersAttached) return;

        this.addEventBtn?.addEventListener('click', () => this.openModal());

        this.eventForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        const closeButtons = this.eventModal?.querySelectorAll('.close-button, .close-modal-btn');
        closeButtons?.forEach(button => {
            button.addEventListener('click', () => this.closeModal());
        });

        this.eventListenersAttached = true;
    }

    async renderEvents() {
        if (!this.eventList) return;

        try {
            this.isLoading = true;
            const response = await window.authUtils.fetchWithAuth(this.endpoints.base);
            const events = Array.isArray(response) ? response : response.results || [];

            this.events = events;
            window.loanCaseApp.events = events;

            this.eventList.innerHTML = '';
            events.forEach(event => this.renderEventItem(event));

        } catch (error) {
            console.error('Events rendering error:', error);
            window.authUtils.showToast('에러', '이벤트를 불러오는데 실패했습니다.', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    renderEventItem(event) {
        const li = document.createElement('li');
        li.id = `event-${event.id}`;
        li.className = 'bg-white rounded-lg shadow p-4 mb-4';

        const typeLabels = {
            scheduled: '접수',
            authorizing: '자서',
            journalizing: '기표'
        };

        li.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 text-xs rounded ${event.event_type === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                event.event_type === 'authorizing' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'}">
                            ${typeLabels[event.event_type]}
                        </span>
                        <h4 class="font-medium text-lg">${event.title}</h4>
                    </div>
                    ${event.description ? `<p class="text-gray-600 mt-1">${event.description}</p>` : ''}
                    <div class="mt-2 text-sm text-gray-500">
                        <div>예정일: ${event.date}</div>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button type="button" class="edit-event text-blue-600 hover:text-blue-900"
                            data-id="${event.id}">수정</button>
                    <button type="button" class="delete-event text-red-600 hover:text-red-900"
                            data-id="${event.id}">삭제</button>
                </div>
            </div>
        `;

        const editBtn = li.querySelector('.edit-event');
        const deleteBtn = li.querySelector('.delete-event');

        editBtn?.addEventListener('click', () => this.openModal(event.id));
        deleteBtn?.addEventListener('click', () => this.deleteEvent(event.id));

        this.eventList.appendChild(li);
    }

    async openModal(eventId = null) {
        this.currentEventId = eventId;

        if (eventId) {
            try {
                const event = this.events.find(e => e.id === eventId);
                if (event) {
                    event.loan_case = this.loanCaseId;
                    this.populateForm(event);
                } else {
                    throw new Error('이벤트를 찾을 수 없습니다.');
                }
            } catch (error) {
                window.authUtils.showToast('에러', error.message, 'error');
                return;
            }
        } else {
            this.eventForm?.reset();
            ['Scheduled', 'Authorizing', 'Journalizing'].forEach(type => {
                const titleCheckbox = document.getElementById(`useDefault${type}Title`);
                const descCheckbox = document.getElementById(`useDefault${type}Desc`);
                if (titleCheckbox) titleCheckbox.checked = true;
                if (descCheckbox) descCheckbox.checked = true;
            });
        }

        this.eventModal?.classList.remove('hidden');
    }

    closeModal() {
        this.eventModal?.classList.add('hidden');
        this.currentEventId = null;
        this.eventForm?.reset();
    }

    async handleSubmit() {
        try {
            const formData = new FormData(this.eventForm);
            const events = [];
            const types = ['scheduled', 'authorizing', 'journalizing'];

            console.group('Event Submission');
            console.log('Form Data:');
            for (let [key, value] of formData.entries()) {
                console.log(key, ':', value);
            }

            types.forEach(type => {
                const checkbox = document.getElementById(`use${type.charAt(0).toUpperCase() + type.slice(1)}Date`);
                console.log(`${type} checkbox state:`, checkbox?.checked);

                if (checkbox?.checked) {
                    const title = formData.get(`${type}_title`);
                    const date = formData.get(`${type}_date`);
                    const description = formData.get(`${type}_description`);

                    if (!title || !date) {
                        throw new Error(`${type} 이벤트의 제목과 날짜를 모두 입력해주세요.`);
                    }

                    events.push({
                        title,
                        description: description || '',
                        date,
                        event_type: type,
                        loan_case: this.loanCaseId
                    });
                }
            });

            if (events.length === 0) {
                throw new Error('최소 하나의 일정을 선택해주세요.');
            }

            console.log('Events to be created:', events);

            // 각 이벤트를 개별적으로 생성
            for (const event of events) {
                const response = await window.authUtils.fetchWithAuth(
                    this.endpoints.create,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(event)
                    }
                );
                console.log('API Response:', response);
            }

            console.groupEnd();

            this.closeModal();
            await this.renderEvents();

            window.authUtils.showToast(
                '성공',
                `${events.length}개의 일정이 등록되었습니다.`,
                'success'
            );

        } catch (error) {
            console.error('Submit error:', error);
            window.authUtils.showToast('에러', error.message, 'error');
        }
    }

    async deleteEvent(eventId) {
        if (!confirm('이벤트를 삭제하시겠습니까?')) return;
    
        try {
            await window.authUtils.fetchWithAuth(
                this.endpoints.detail(eventId),
                { 
                    method: 'DELETE',
                    handleEmptyResponse: true  // 이미 있음
                }
            );
    
            // 성공적으로 삭제된 경우 UI 업데이트
            const element = document.getElementById(`event-${eventId}`);
            if (element) {
                element.remove();
            }
    
            this.events = this.events.filter(e => e.id !== eventId);
            window.loanCaseApp.events = this.events;
    
            window.authUtils.showToast('성공', '이벤트가 삭제되었습니다.', 'success');
    
        } catch (error) {
            // 실제 오류인 경우에만 에러 메시지 표시
            if (!(error instanceof SyntaxError && error.message.includes('Unexpected end of JSON input'))) {
                console.error('Delete error:', error);
                window.authUtils.showToast('에러', '이벤트 삭제에 실패했습니다.', 'error');
            }
        }
    }

    setupEventForm() {
        console.log('Setting up event form controls');
        ['Scheduled', 'Authorizing', 'Journalizing'].forEach(type => {
            const checkbox = document.getElementById(`use${type}Date`);
            const inputs = document.querySelector(`[data-type="${type.toLowerCase()}"]`);
            const defaultTitleCheckbox = document.getElementById(`useDefault${type}Title`);
            const defaultDescCheckbox = document.getElementById(`useDefault${type}Desc`);

            if (checkbox && inputs) {
                // 초기 상태 설정
                inputs.style.display = 'none';

                // 체크박스 변경 이벤트
                checkbox.addEventListener('change', (e) => {
                    console.log(`${type} checkbox changed:`, e.target.checked);
                    inputs.style.display = e.target.checked ? 'block' : 'none';
                    if (e.target.checked) {
                        this.updateDefaultValues(type.toLowerCase());
                    }
                });

                // 기본값 체크박스 이벤트
                defaultTitleCheckbox?.addEventListener('change', () => {
                    this.updateDefaultValues(type.toLowerCase());
                });

                defaultDescCheckbox?.addEventListener('change', () => {
                    this.updateDefaultValues(type.toLowerCase());
                });
            }
        });
    }
    updateDefaultValues(type) {
        const typeLabels = {
            scheduled: '접수',
            authorizing: '자서',
            journalizing: '기표'
        };
    
        // h1 태그에서 차주명 가져오기
        const headerTitle = document.querySelector('h1');
        const borrowerName = headerTitle ? 
            headerTitle.textContent.split('님의')[0].trim() : 
            '차주';
    
        const titleInput = this.eventForm.querySelector(`input[name="${type}_title"]`);
        const descInput = this.eventForm.querySelector(`textarea[name="${type}_description"]`);
        const useTitleCheckbox = document.getElementById(`useDefault${type.charAt(0).toUpperCase() + type.slice(1)}Title`);
        const useDescCheckbox = document.getElementById(`useDefault${type.charAt(0).toUpperCase() + type.slice(1)}Desc`);
    
        if (useTitleCheckbox?.checked && titleInput) {
            titleInput.value = `${borrowerName}님의 ${typeLabels[type]} 일정`;
        }
        if (useDescCheckbox?.checked && descInput) {
            const descriptions = {
                scheduled: `${borrowerName}고객 대출 접수 일정입니다.`,
                authorizing: `${borrowerName}고객 대출 자서 일정입니다.`,
                journalizing: `${borrowerName}고객 대출 기표 일정입니다.`
            };
            descInput.value = descriptions[type];
        }
    }

    populateForm(event) {
        if (!this.eventForm) return;

        Object.entries(event).forEach(([key, value]) => {
            const input = this.eventForm.elements[key];
            if (input) input.value = value || '';
        });
    }
}

// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', async () => {
    const eventManager = new EventManager();
    await eventManager.initialize();
});

export default EventManager;