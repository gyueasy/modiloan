// case_todo.js
import { todoModal, templateModal } from './todos/modal.js';

let loadTodosFunction;
let currentLoanCaseId;

async function waitForLoanCaseId() {
    console.log('Waiting for Loan Case ID...');
    
    // 최대 10초 동안 기다림
    for (let i = 0; i < 100; i++) {
        // window.loanCaseApp이 초기화되었는지 먼저 확인
        if (window.loanCaseApp?.caseId) {
            console.log('LoanCase ID from window.loanCaseApp:', window.loanCaseApp.caseId);
            return window.loanCaseApp.caseId;
        }

        // DOM에서도 체크
        const loanCaseIdElement = document.getElementById('loanCaseId');
        const loanCaseId = loanCaseIdElement?.value?.trim();

        if (loanCaseId) {
            console.log('LoanCase ID from DOM:', loanCaseId);
            return loanCaseId;
        }

        // 100ms 대기
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('LoanCase ID를 찾을 수 없습니다.');
}

async function loadTodos() {
    try {
        const encodedLoanCaseId = encodeURIComponent(currentLoanCaseId);
        const response = await window.authUtils.fetchWithAuth(`/api/todos/?loan_case=${encodedLoanCaseId}`);

        console.log('Todo API Response:', response);
        const todoList = document.getElementById('todoList');

        if (response && response.results) {
            todoList.innerHTML = response.results.map(todo => `
               <div class="bg-gray-50 p-3 rounded-lg mb-3">
                   <div class="flex justify-between items-start">
                       <div class="flex-1">
                           <h3 class="font-medium text-gray-900">${todo.title}</h3>
                           <p class="text-sm text-gray-600 mt-1">${todo.content || ''}</p>
                       </div>
                       <div class="flex items-center space-x-2">
                           <select class="text-xs rounded-lg border-gray-300 py-1 px-2"
                               onchange="updateTodoStatus(${todo.id}, this.value)">
                               <option value="pending" ${todo.status === 'pending' ? 'selected' : ''}>대기</option>
                               <option value="in_progress" ${todo.status === 'in_progress' ? 'selected' : ''}>진행중</option>
                               <option value="completed" ${todo.status === 'completed' ? 'selected' : ''}>완료</option>
                           </select>
                           <button onclick="editTodo(${todo.id})" class="text-blue-600 hover:text-blue-800 text-sm">
                               수정
                           </button>
                           <button onclick="deleteTodo(${todo.id})" class="text-red-600 hover:text-red-800 text-sm">
                               삭제
                           </button>
                       </div>
                   </div>
                   <div class="mt-2 flex justify-between items-center text-xs text-gray-500">
                       <div>
                           <span class="px-2 py-1 rounded-full ${getPriorityClass(todo.priority)}">
                               ${todo.priority_display}
                           </span>
                       </div>
                       <div class="flex items-center space-x-2">
                           <span>${todo.assigned_to_detail?.username || '미지정'}</span>
                           <span class="${getDeadlineClass(todo.deadline)}">
                               ${formatDateTime(todo.deadline)}
                           </span>
                       </div>
                   </div>
               </div>
           `).join('');
        } else {
            todoList.innerHTML = '<p class="text-gray-500 text-sm">할 일이 없습니다.</p>';
        }
    } catch (error) {
        console.error('할 일 목록 로드 실패:', error);
        todoList.innerHTML = `<p class="text-red-500 text-sm">오류: ${error.message}</p>`;
    }
}

function getPriorityClass(priority) {
    const classes = {
        3: 'bg-red-100 text-red-800',
        2: 'bg-yellow-100 text-yellow-800',
        1: 'bg-green-100 text-green-800'
    };
    return classes[priority] || '';
}

function getStatusClass(status) {
    const classes = {
        'pending': 'bg-gray-100 text-gray-800',
        'in_progress': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800'
    };
    return classes[status] || '';
}

function getDeadlineClass(deadline) {
    if (!deadline) return 'text-gray-500';
    const deadlineDate = new Date(deadline);
    const today = new Date();
    return deadlineDate < today ? 'text-red-600' : 'text-gray-900';
}

function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function initializeTodos() {
    try {
        console.log('Initializing Todos...');
        
        const loanCaseId = await waitForLoanCaseId();
        currentLoanCaseId = loanCaseId;

        const todoList = document.getElementById('todoList');
        const createTodoBtn = document.getElementById('createTodoBtn');

        console.log('Loan Case ID loaded:', loanCaseId);
        console.log('Todo Modal:', todoModal);
        console.log('Template Modal:', templateModal);

        if (!todoList || !createTodoBtn) {
            console.error('필수 요소가 존재하지 않습니다.', {
                todoList: !!todoList,
                createTodoBtn: !!createTodoBtn
            });
            return;
        }

        // 할일 추가 버튼 이벤트
        createTodoBtn.addEventListener('click', () => {
            console.log('Create Todo Button Clicked');
            console.log('Current Loan Case ID:', currentLoanCaseId);
            
            if (!todoModal) {
                console.error('Todo Modal이 초기화되지 않았습니다.');
                return;
            }
            
            // setCurrentLoanCase 메서드 이름 확인
            if (typeof todoModal.setCurrentLoanCase === 'function') {
                console.log('Setting Current Loan Case:', currentLoanCaseId);
                todoModal.setCurrentLoanCase(currentLoanCaseId);
            } else if (typeof todoModal.setLoanCase === 'function') {
                console.log('Setting Loan Case:', currentLoanCaseId);
                todoModal.setLoanCase(currentLoanCaseId);
            } else {
                console.error('No method found to set loan case');
            }
            
            console.log('Attempting to open modal');
            todoModal.open();
        });

        // 템플릿에서 생성 버튼 이벤트 추가
        const createFromTemplateBtn = document.getElementById('createFromTemplateBtn');
        if (createFromTemplateBtn) {
            createFromTemplateBtn.addEventListener('click', () => {
                if (!templateModal) {
                    console.error('Template Modal이 초기화되지 않았습니다.');
                    return;
                }
                templateModal.setLoanCase(loanCaseId);
                templateModal.open();
            });
        }

        loadTodosFunction = loadTodos;
        window.loadTodos = loadTodos;

        // 초기 로드
        loadTodos();

    } catch (error) {
        console.error('Todo 초기화 실패:', error);
    }
}

// 글로벌 함수들
window.updateTodoStatus = async (id, newStatus) => {
    try {
        await window.authUtils.fetchWithAuth(`/api/todos/${id}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });
        window.authUtils.showToast('성공', '상태가 변경되었습니다.', 'success');
        loadTodos();  // 목록 새로고침
    } catch (error) {
        console.error('상태 변경 실패:', error);
        window.authUtils.showToast('오류', '상태 변경에 실패했습니다.', 'error');
    }
};

window.editTodo = async (id) => {
    try {
        const data = await window.authUtils.fetchWithAuth(`/api/todos/${id}/`);
        if (!data) return;
        console.log('Editing Todo:', data);
        todoModal.open(data);
    } catch (error) {
        console.error('할일 정보 로드 실패:', error);
        window.authUtils.showToast('오류', '할일 정보를 불러오는데 실패했습니다.', 'error');
    }
};

window.deleteTodo = async (id) => {
    if (!confirm('정말 이 할일을 삭제하시겠습니까?')) return;

    try {
        await window.authUtils.fetchWithAuth(`/api/todos/${id}/`, {
            method: 'DELETE'
        });
        window.authUtils.showToast('성공', '할일이 삭제되었습니다.', 'success');
        loadTodos(); // 목록 새로고침
    } catch (error) {
        console.error('할일 삭제 실패:', error);
        window.authUtils.showToast('오류', '할일 삭제에 실패했습니다.', 'error');
    }
};

// CaseDetailManager의 초기화가 완료된 후 실행
document.addEventListener('appInitialized', async () => {
    console.log('App initialized event received');
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        console.log('Starting todos initialization');
        await todoModal.initialize();
        await templateModal.initialize();
        await initializeTodos();
    } catch (error) {
        console.error('Todo 초기화 중 오류:', error);
    }
});

// 이미 초기화되어 있을 경우를 대비
if (window.loanCaseApp?.initialized) {
    console.log('App already initialized, starting initialization');
    todoModal.initialize();
    templateModal.initialize();
    initializeTodos();
}