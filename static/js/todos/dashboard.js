import { todoModal, templateModal } from './modal.js';

document.addEventListener('DOMContentLoaded', async function () {
    // 상태 변수들
    let currentPage = 1;
    let pageSize = 20;
    let totalItems = 0;

    // DOM 요소들
    const todoList = document.getElementById('todoList');
    const pagination = document.getElementById('pagination');
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const searchInput = document.getElementById('searchInput');
    const selectAll = document.getElementById('selectAll');

    // 모달 초기화
    await todoModal.initialize();
    await templateModal.initialize();

    // 대시보드 통계 로드
    async function loadDashboardStats() {
        try {
            const stats = await window.authUtils.fetchWithAuth('/api/todos/dashboard_stats/');
            
            document.getElementById('totalTodos').textContent = stats.total_stats.total;
            document.getElementById('inProgressTodos').textContent = stats.total_stats.in_progress;
            document.getElementById('todayDeadlineTodos').textContent = stats.deadline_stats.today;
            document.getElementById('myTodos').textContent = stats.my_todos.total;
        } catch (error) {
            console.error('통계 로드 실패:', error);
        }
    }

    // Todo 목록 로드
    async function loadTodos(page = 1) {
        try {
            const status = statusFilter.value;
            const priority = priorityFilter.value;
            const search = searchInput.value;

            let url = `/api/todos/?page=${page}&page_size=${pageSize}`;
            if (status) url += `&status=${status}`;
            if (priority) url += `&priority=${priority}`;
            if (search) url += `&search=${search}`;

            const data = await window.authUtils.fetchWithAuth(url);
            
            totalItems = data.count;
            renderTodos(data.results);
            renderPagination(data.count);

            document.getElementById('totalCount').textContent = data.count;
        } catch (error) {
            console.error('Todo 목록 로드 실패:', error);
        }
    }

    // Todo 목록 렌더링
    function renderTodos(todos) {
        todoList.innerHTML = todos.map(todo => `
            <tr>
                <td class="px-6 py-4">
                    <input type="checkbox" class="todo-checkbox rounded border-gray-300" value="${todo.id}">
                </td>
                <td class="px-6 py-4">
                    <div class="font-medium text-gray-900">${todo.title}</div>
                    <div class="text-sm text-gray-500">${todo.content}</div>
                </td>
                <td class="px-6 py-4">
                                <a href="/web/cases/${todo.loan_case}/" class="hover:text-blue-600">
                    <div class="text-sm text-gray-900">${todo.loan_case_detail.borrower_name}</div>
                    <div class="text-xs text-gray-500">${todo.loan_case_detail.status_display}</div>
                </a>
                    </td>
                <td class="px-6 py-4">
                    <select 
                        class="priority-select text-xs rounded-lg border-gray-300 py-1 px-2"
                        data-todo-id="${todo.id}"
                        onchange="updateTodoPriority(this)">
                        <option value="1" ${todo.priority === 1 ? 'selected' : ''}>낮음</option>
                        <option value="2" ${todo.priority === 2 ? 'selected' : ''}>보통</option>
                        <option value="3" ${todo.priority === 3 ? 'selected' : ''}>높음</option>
                    </select>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${todo.assigned_to_detail?.username || '-'}
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm ${getDeadlineClass(todo.deadline)}">
                        ${formatDateTime(todo.deadline)}
                    </div>
                </td>
                <td class="px-6 py-4">
                    <select 
                        class="status-select text-xs rounded-lg border-gray-300 py-1 px-2"
                        data-todo-id="${todo.id}"
                        onchange="updateTodoStatus(this)">
                        <option value="pending" ${todo.status === 'pending' ? 'selected' : ''}>대기</option>
                        <option value="in_progress" ${todo.status === 'in_progress' ? 'selected' : ''}>진행중</option>
                        <option value="completed" ${todo.status === 'completed' ? 'selected' : ''}>완료</option>
                    </select>
                </td>
                <td class="px-6 py-4 text-sm">
                    <button onclick="editTodo(${todo.id})" class="text-blue-600 hover:text-blue-800">수정</button>
                    <button onclick="deleteTodo(${todo.id})" class="ml-2 text-red-600 hover:text-red-800">삭제</button>
                </td>
            </tr>
        `).join('');
    }

    // 상태 업데이트 함수 추가
    window.updateTodoStatus = async (select) => {
        const todoId = select.dataset.todoId;
        const newStatus = select.value;

        try {
            await window.authUtils.fetchWithAuth(`/api/todos/${todoId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus
                })
            });
            window.authUtils.showToast('성공', '상태가 변경되었습니다.', 'success');
        } catch (error) {
            console.error('상태 변경 실패:', error);
            window.authUtils.showToast('오류', '상태 변경에 실패했습니다.', 'error');
            loadTodos(currentPage);
        }
    };

    // 우선순위 업데이트 함수 추가
    window.updateTodoPriority = async (select) => {
        const todoId = select.dataset.todoId;
        const newPriority = parseInt(select.value);

        try {
            await window.authUtils.fetchWithAuth(`/api/todos/${todoId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priority: newPriority
                })
            });
            window.authUtils.showToast('성공', '우선순위가 변경되었습니다.', 'success');
        } catch (error) {
            console.error('우선순위 변경 실패:', error);
            window.authUtils.showToast('오류', '우선순위 변경에 실패했습니다.', 'error');
            loadTodos(currentPage);
        }
    };

    // 페이지네이션 렌더링
    function renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / pageSize);
        let html = '';

        for (let i = 1; i <= totalPages; i++) {
            html += `
               <button class="px-3 py-1 text-sm rounded ${i === currentPage ? 'bg-blue-500 text-white' : 'text-gray-600'}"
                   onclick="goToPage(${i})">
                   ${i}
               </button>
           `;
        }

        pagination.innerHTML = html;
    }

    // 이벤트 리스너들
    document.getElementById('createTodoBtn').addEventListener('click', () => {
        todoModal.open();
    });

    document.getElementById('createFromTemplateBtn').addEventListener('click', () => {
        templateModal.open();
    });

    // 전체 선택 체크박스
    selectAll.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.todo-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
    });

    statusFilter.addEventListener('change', () => loadTodos(1));
    priorityFilter.addEventListener('change', () => loadTodos(1));
    searchInput.addEventListener('input', debounce(() => loadTodos(1), 300));

    // 벌크 액션 버튼들
    document.getElementById('bulkCompleteBtn')?.addEventListener('click', () => {
        bulkUpdateStatus('completed');
    });

    document.getElementById('bulkArchiveBtn')?.addEventListener('click', () => {
        bulkUpdateArchive(true);
    });

    // 유틸리티 함수들
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

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 글로벌 함수들
    window.editTodo = async (id) => {
        try {
            const data = await window.authUtils.fetchWithAuth(`/api/todos/${id}/`);
            if (!data) return;
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
            loadTodos(currentPage);
        } catch (error) {
            console.error('할일 삭제 실패:', error);
            window.authUtils.showToast('오류', '할일 삭제에 실패했습니다.', 'error');
        }
    };

    window.goToPage = (page) => {
        currentPage = page;
        loadTodos(page);
    };

    // 벌크 업데이트 함수들
    async function bulkUpdateStatus(status) {
        const selectedIds = getSelectedTodoIds();
        if (selectedIds.length === 0) {
            window.authUtils.showToast('알림', '선택된 항목이 없습니다.', 'info');
            return;
        }

        try {
            await window.authUtils.fetchWithAuth('/api/todos/bulk_update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    todo_ids: selectedIds,
                    action_type: 'status',
                    value: status
                }),
            });

            window.authUtils.showToast('성공', '선택된 항목이 업데이트되었습니다.', 'success');
            loadTodos(currentPage);
        } catch (error) {
            console.error('벌크 업데이트 실패:', error);
            window.authUtils.showToast('오류', '업데이트에 실패했습니다.', 'error');
        }
    }

    async function bulkUpdateArchive(value) {
        const selectedIds = getSelectedTodoIds();
        if (selectedIds.length === 0) {
            window.authUtils.showToast('알림', '선택된 항목이 없습니다.', 'info');
            return;
        }

        try {
            await window.authUtils.fetchWithAuth('/api/todos/bulk_update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    todo_ids: selectedIds,
                    action_type: 'archive',
                    value: value
                }),
            });

            window.authUtils.showToast('성공', '선택된 항목이 업데이트되었습니다.', 'success');
            loadTodos(currentPage);
        } catch (error) {
            console.error('벌크 업데이트 실패:', error);
            window.authUtils.showToast('오류', '업데이트에 실패했습니다.', 'error');
        }
    }

    function getSelectedTodoIds() {
        const checkboxes = document.querySelectorAll('.todo-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // 페이지 로드 시 실행
    loadDashboardStats();
    loadTodos();
});