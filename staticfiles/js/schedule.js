// 전역 변수
let calendar;
let activeFilter = 'all';
let eventsCache = null;

// 이벤트 타입별 색상 설정
const EVENT_COLORS = {
    'scheduled': '#FB8C00',    // 접수 - 주황색
    'authorizing': '#1E88E5',  // 자서 - 파란색
    'journalizing': '#43A047'  // 기표 - 초록색
};

// 초기화 함수
async function initialize() {
    setupCalendar();
    setupEventListeners();
    await loadEvents();
    updateUpcomingEvents();
}

// 캘린더 설정
function setupCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek'
        },
        locale: 'ko',
        height: 'auto',
        eventClick: handleEventClick,
        eventDidMount: function(info) {
            // 툴팁 설정
            $(info.el).tooltip({
                title: `${info.event.title}\n${info.event.extendedProps.description || ''}`,
                placement: 'top',
                trigger: 'hover',
                container: 'body'
            });
        },
        views: {
            dayGridMonth: {
                dayMaxEvents: 4,
                moreLinkContent: function(args) {
                    return '+' + args.num + '개 더보기';
                }
            },
            listWeek: {
                noEventsContent: '예정된 일정이 없습니다'
            }
        }
    });

    calendar.render();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active', 'bg-blue-100', 'text-blue-700'));
            btn.classList.add('active', 'bg-blue-100', 'text-blue-700');
            activeFilter = btn.dataset.type;
            filterEvents();
        });
    });

    document.getElementById('addEventBtn')?.addEventListener('click', () => {
        window.location.href = '/web/cases/add/';
    });
}

// 이벤트 로드
async function loadEvents() {
    try {
        const response = await window.authUtils.fetchWithAuth('/api/events/');
        if (!response) return;
        
        eventsCache = response;
        displayEvents(response);
    } catch (error) {
        console.error('이벤트 로드 중 에러:', error);
        window.authUtils.showToast('에러', '일정을 불러오는데 실패했습니다.', 'error');
    }
}

// 이벤트 표시
function displayEvents(events) {
    if (!calendar) return;
    
    calendar.removeAllEvents();
    
    const calendarEvents = events.map(event => ({
        id: event.id,
        title: event.title,
        start: event.date,
        backgroundColor: EVENT_COLORS[event.event_type],
        extendedProps: {
            description: event.description,
            loan_case: event.loan_case,
            type: event.event_type
        }
    }));
    
    calendar.addEventSource(calendarEvents);
}

// 이벤트 필터링
function filterEvents() {
    if (!eventsCache) return;
    
    const filteredEvents = activeFilter === 'all' 
        ? eventsCache 
        : eventsCache.filter(event => event.event_type === activeFilter);
    
    displayEvents(filteredEvents);
    updateUpcomingEvents(filteredEvents);
}

// 다가오는 이벤트 업데이트
function updateUpcomingEvents(events = eventsCache) {
    if (!events) return;

    const upcomingContainer = document.getElementById('upcomingEvents');
    if (!upcomingContainer) return;

    const today = new Date();
    const filteredEvents = events
        .filter(event => new Date(event.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

    upcomingContainer.innerHTML = filteredEvents.length 
        ? filteredEvents.map(event => `
            <div class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onclick="openEventDetail(${event.loan_case})">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" 
                        style="background-color: ${EVENT_COLORS[event.event_type]}"></div>
                    <p class="font-medium">${event.title}</p>
                </div>
                <p class="text-sm text-gray-600 mt-1">${new Date(event.date).toLocaleDateString()}</p>
            </div>
        `).join('')
        : '<p class="text-gray-500 text-center">예정된 일정이 없습니다.</p>';
}

// 이벤트 클릭 핸들러
function handleEventClick(info) {
    const loanCaseId = info.event.extendedProps.loan_case;
    if (loanCaseId) {
        window.location.href = `/web/cases/${loanCaseId}/`;
    }
}

// 이벤트 상세 페이지 열기
function openEventDetail(caseId) {
    window.location.href = `/web/cases/${caseId}/`;
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initialize);