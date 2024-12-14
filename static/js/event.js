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

            // caseId 설정
            this.loanCaseId = window.loanCaseApp?.caseId;
            if (!this.loanCaseId) {
                throw new Error('Case ID not found');
            }

            this.initializeDOMElements();
            console.log('DOM elements initialized');

            this.initializeEndpoints();
            console.log('Endpoints initialized');

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
        li.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-medium text-lg">${event.title}</h4>
                    ${event.description ? `<p class="text-gray-600 mt-1">${event.description}</p>` : ''}
                    <div class="mt-2 text-sm text-gray-500 space-y-1">
                        ${event.authorizing_date ? `<div>자서예정일: ${event.authorizing_date}</div>` : ''}
                        ${event.journalizing_date ? `<div>기표예정일: ${event.journalizing_date}</div>` : ''}
                        ${event.scheduled_date ? `<div>요청일: ${event.scheduled_date}</div>` : ''}
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button type="button" 
                            class="edit-event text-blue-600 hover:text-blue-900"
                            data-id="${event.id}">수정</button>
                    <button type="button" 
                            class="delete-event text-red-600 hover:text-red-900"
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
            const data = Object.fromEntries(formData);

            Object.keys(data).forEach(key => {
                if (data[key] === '') {
                    data[key] = null;
                }
            });

            data.loan_case = this.loanCaseId;

            const endpoint = this.currentEventId ?
                this.endpoints.detail(this.currentEventId) :
                this.endpoints.create;

            const method = this.currentEventId ? 'PUT' : 'POST';

            const response = await window.authUtils.fetchWithAuth(endpoint, {
                method,
                body: JSON.stringify(data)
            });

            this.closeModal();
            await this.renderEvents();

            window.authUtils.showToast(
                '성공',
                `이벤트가 ${this.currentEventId ? '수정' : '생성'}되었습니다.`,
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
                    handleEmptyResponse: true
                }
            );
    
            const element = document.getElementById(`event-${eventId}`);
            if (element) {
                element.remove();
            }
    
            this.events = this.events.filter(e => e.id !== eventId);
            window.loanCaseApp.events = this.events;
    
            window.authUtils.showToast('성공', '이벤트가 삭제되었습니다.', 'success');
    
        } catch (error) {
            console.error('Delete error:', error);
            window.authUtils.showToast('에러', '이벤트 삭제에 실패했습니다.', 'error');
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
document.addEventListener('DOMContentLoaded', () => {
    const eventManager = new EventManager();
    eventManager.initialize();
});

export default EventManager;