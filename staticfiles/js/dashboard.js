// 전역 변수 설정
let calendar;
let apiResponseCache = null;
let eventsResponseCache = null;

// 상태값 정의
const STATUS_COLORS = {
    '단순조회중': '#E3F2FD',
    '신용조회중': '#90CAF9',
    '서류수취중': '#64B5F6',
    '심사중': '#42A5F5',
    '승인': '#2196F3',
    '자서예정': '#1E88E5',
    '기표예정': '#1976D2',
    '용도증빙': '#1565C0',
    '완료': '#0D47A1'
};

// 우선순위 색상
const PRIORITY_COLORS = {
    '높음': '#ef4444',
    '중간': '#f59e0b',
    '낮음': '#6b7280'
};

// DOM 요소 참조
const DOM = {
    modal: document.getElementById('apiModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalContent: document.getElementById('apiContent'),
    closeModalBtn: document.getElementById('closeModal'),
    copyResponseBtn: document.getElementById('copyResponse'),
    showApiBtn: document.getElementById('showApiResponse'),
    showEventsBtn: document.getElementById('showEventsResponse'),
    statElements: {
        newCases: document.querySelector('[data-stat="new-cases"]'),
        newCasesDiff: document.querySelector('[data-stat="new-cases-diff"]'),
        ongoingCases: document.querySelector('[data-stat="ongoing-cases"]'),
        ongoingCasesDiff: document.querySelector('[data-stat="ongoing-cases-diff"]'),
        monthlyStats: document.querySelector('[data-stat="monthly-stats"]'),
        monthlyAmount: document.querySelector('[data-stat="monthly-amount"]')
    }
};

// API 요청 함수
async function fetchWithAuth(url) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return null;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        return null;
    }
}

// 모달 관련 함수들
const Modal = {
    show(title, content) {
        DOM.modalTitle.textContent = title;
        DOM.modalContent.textContent = JSON.stringify(content, null, 2);
        DOM.modal.classList.remove('hidden');
        DOM.modal.classList.add('show');
    },

    hide() {
        DOM.modal.classList.remove('show');
        DOM.modal.classList.add('hidden');
    },

    async copyContent() {
        const content = DOM.modalContent.textContent;
        try {
            await navigator.clipboard.writeText(content);
            const originalText = DOM.copyResponseBtn.innerHTML;
            DOM.copyResponseBtn.innerHTML = '<span>복사 완료!</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';

            setTimeout(() => {
                DOM.copyResponseBtn.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }
};

// 대시보드 데이터 업데이트 함수들
const Dashboard = {
    async updateStats() {
        const data = await fetchWithAuth('/api/');
        if (!data) return;

        apiResponseCache = data;

        // 통계 업데이트
        this.updateStatElement('new-cases', data.today_stats.new_cases);
        this.updateStatElement('ongoing-cases', data.today_stats.ongoing_cases);

        // 월별 통계 업데이트
        if (data.month_stats) {
            const monthlyStats = document.querySelector('[data-stat="monthly-stats"]');
            if (monthlyStats) {
                monthlyStats.textContent = `${data.month_stats.count}건`;

                const monthlyAmount = document.querySelector('[data-stat="monthly-amount"]');
                if (monthlyAmount) {
                    monthlyAmount.textContent = `${data.month_stats.amount.toLocaleString()}만원`;
                }
            }
        }

        // 긴급 케이스 업데이트
        this.updateUrgentCases(data.urgent_cases);

        // 공지사항 업데이트
        this.updateNotices(data.notices);

        // 최근 케이스 업데이트
        this.updateRecentCases(data.recent_cases);
    },

    // 최근 케이스 업데이트 메소드 추가
    updateRecentCases(cases) {
        const container = document.querySelector('.recent-cases-container');
        if (!container || !cases) return;

        container.innerHTML = cases.length ? cases.map(case_ => `
        <a href="/web/cases/${case_.id}/" class="block bg-gray-50 rounded p-3 hover:bg-gray-100 transition">
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-medium text-gray-800">${case_.borrower_name}</p>
                    <p class="text-sm text-gray-600">
                        ${case_.status_display || case_.status}
                        ${case_.loan_amount ? ` - ${case_.loan_amount.toLocaleString()}만원` : ''}
                    </p>
                </div>
                <span class="text-sm text-gray-500">${new Date(case_.created_at).toLocaleDateString()}</span>
            </div>
        </a>
    `).join('') : '<p class="text-gray-500 text-center">최근 등록된 케이스가 없습니다.</p>';
    },

    startAutoRefresh() {
        // 5분마다 자동 새로고침
        setInterval(() => {
            this.updateStats();
            this.updateEvents();
        }, 5 * 60 * 1000);
    },

    updateStatElement(elementId, value, diff) {
        const element = document.querySelector(`[data-stat="${elementId}"]`);
        if (element) {
            element.textContent = `${value}건`;

            const diffElement = document.querySelector(`[data-stat="${elementId}-diff"]`);
            if (diffElement && diff !== undefined) {
                const diffText = diff > 0 ? `+${diff}` : diff;
                diffElement.textContent = `${diffText} (전일 대비)`;
                diffElement.className = `stat-diff ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}`;
            }
        }
    },

    updateUrgentCases(cases) {
        const container = document.querySelector('.urgent-cases-container');
        if (!container || !cases) return;

        container.innerHTML = cases.length ? cases.map(case_ => `
            <a href="/web/cases/${case_.id}" class="block">
                <div class="urgent-case">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-medium text-red-800">${case_.borrower_name}</p>
                            <p class="text-sm text-red-600">
                                ${case_.status}
                                ${case_.scheduled_date ? ` - ${new Date(case_.scheduled_date).toLocaleDateString()}` : ''}
                            </p>
                        </div>
                        ${case_.is_urgent ? '<span class="urgent-badge">긴급</span>' : ''}
                    </div>
                </div>
            </a>
        `).join('') : '<p class="text-gray-500">긴급처리가 필요한 건이 없습니다.</p>';
    },

    updateNotices(notices) {
        const container = document.querySelector('.notices-container');
        if (!container || !notices) return;

        container.innerHTML = notices.length ? notices.map(notice => `
            <div class="notice ${notice.priority}">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-medium">${notice.title}</h4>
                    <span class="text-sm text-gray-500">${new Date(notice.created_at).toLocaleDateString()}</span>
                </div>
                <p class="text-gray-600">${notice.content}</p>
            </div>
        `).join('') : '<p class="text-gray-500">등록된 공지사항이 없습니다.</p>';
    },

    async updateEvents() {
        console.log('updateEvents 시작');
        try {
            // 내부 fetchWithAuth 메서드로 직접 호출
            const response = await fetchWithAuth('/api/events/');

            console.log('fetchWithAuth 응답:', response);

            if (!response) {
                console.warn('응답이 없습니다.');
                return;
            }

            const events = Array.isArray(response) ? response :
                (response.results ? response.results : []);

            console.log('파싱된 이벤트:', events);

            if (!events.length) {
                console.warn('이벤트가 없습니다.');
                return;
            }

            eventsResponseCache = events;

            if (calendar) {
                calendar.removeAllEvents();

                const calendarEvents = events.map(event => {
                    let backgroundColor, title;

                    switch (event.event_type) {
                        case 'scheduled':
                            backgroundColor = '#FB8C00';
                            title = `${event.title} (접수)`;
                            break;
                        case 'authorizing':
                            backgroundColor = '#1E88E5';
                            title = `${event.title} (자서)`;
                            break;
                        case 'journalizing':
                            backgroundColor = '#43A047';
                            title = `${event.title} (기표)`;
                            break;
                        default:
                            backgroundColor = '#90CAF9';
                            title = event.title;
                    }

                    return {
                        id: event.id,
                        title: title,
                        start: event.date,
                        backgroundColor: backgroundColor,
                        extendedProps: {
                            description: event.description,
                            loan_case: event.loan_case,
                            type: event.event_type
                        }
                    };
                });

                console.log('캘린더 이벤트:', calendarEvents);
                calendar.addEventSource(calendarEvents);
            }
        } catch (error) {
            console.error('updateEvents 에러:', error);
        }
    }
};

// 캘린더 초기화
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        locale: 'ko',
        height: 'auto',
        eventClick: function (info) {
            const event = info.event;
            const loanCaseId = event.extendedProps.loan_case;

            // loan_case id로 상세 페이지 이동
            if (loanCaseId) {
                window.location.href = `/web/cases/${loanCaseId}/`;
            }
        },
        eventDidMount: function (info) {
            // 툴팁 설정
            $(info.el).tooltip({
                title: `${info.event.title}\n${info.event.extendedProps.description || ''}`,
                placement: 'top',
                trigger: 'hover',
                container: 'body'
            });
        }
    });

    calendar.render();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 모달 관련 이벤트
    DOM.closeModalBtn.addEventListener('click', Modal.hide);
    DOM.modal.addEventListener('click', (e) => {
        if (e.target === DOM.modal) Modal.hide();
    });
    DOM.copyResponseBtn.addEventListener('click', Modal.copyContent);

    // API 응답 보기 버튼
    DOM.showApiBtn.addEventListener('click', () => {
        Modal.show('API 응답', apiResponseCache);
    });

    DOM.showEventsBtn.addEventListener('click', () => {
        Modal.show('이벤트 API 응답', eventsResponseCache);
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') Modal.hide();
    });
}

// 초기화 함수
function initialize() {
    setupEventListeners();
    initializeCalendar();
    Dashboard.updateStats();
    Dashboard.updateEvents();
    Dashboard.startAutoRefresh();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function () {
    console.log('★★★ DOMContentLoaded 이벤트 발생 ★★★');
    initialize();
});

// 또는 즉시 실행으로도 체크
(function () {
    console.log('★★★ 스크립트 즉시 실행 ★★★');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();