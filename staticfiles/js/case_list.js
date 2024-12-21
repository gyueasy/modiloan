// 상태값 정의 - 대시보드와 동일한 색상 시스템 사용
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

class CaseListManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.initializeEventListeners();
        this.loadCases();
    }

    initializeEventListeners() {
        document.getElementById('searchButton').addEventListener('click', () => this.loadCases());
        document.getElementById('resetButton').addEventListener('click', () => this.resetFilters());
        document.getElementById('filterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.loadCases();
        });
        document.getElementById('selectAll').addEventListener('click', (e) => {
            const checkboxes = document.querySelectorAll('.case-checkbox');
            checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
        });
    }

    getBusinessTypeLabel(type) {
        // API에서 오는 business_type 값에 맞게 수정
        const businessTypes = {
            '일반(가)': '일반(가)',
            '일반(실)': '일반(실)',
            '면세': '면세',
            '법인': '법인',
            '간이(가)': '간이(가)',
            '간이(실)': '간이(실)',
        };
        return businessTypes[type] || type || '-';
    }

    getStatusColor(status) {
        const color = STATUS_COLORS[status];
        if (!color) return 'bg-gray-100 text-gray-800';

        // Tailwind 클래스로 변환
        const rgb = this.hexToRgb(color);
        return `bg-[${color}] text-[${this.getContrastColor(rgb)}]`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    getContrastColor(rgb) {
        // W3C 기준에 따른 밝기 계산
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#FFFFFF';
    }

    async deleteCase(caseId) {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            const response = await window.authUtils.fetchWithAuth(`/api/cases/${caseId}/delete/`, {
                method: 'DELETE'
            });

            if (response === null || response === undefined) {
                window.authUtils.showToast('성공', '케이스가 삭제되었습니다.');
                await this.loadCases();
            } else {
                throw new Error('삭제 실패');
            }
        } catch (error) {
            console.error('Delete error:', error);
            window.authUtils.showToast('에러', '삭제 중 오류가 발생했습니다.', 'error');
        }
    }

    async loadCases() {
        try {
            const queryParams = this.getQueryParams();
            const response = await window.authUtils.fetchWithAuth(`/api/cases/?${queryParams}`);

            if (Array.isArray(response)) {
                this.renderCases(response);
                this.totalPages = 1;
            } else if (response?.results) {
                this.renderCases(response.results);
                this.totalPages = Math.ceil(response.count / this.pageSize);
            }
            this.renderPagination();
        } catch (error) {
            console.error('Error loading cases:', error);
            window.authUtils.showToast('에러', '데이터를 불러오는데 실패했습니다.', 'error');
        }
    }

    renderCases(cases) {
        const tbody = document.getElementById('caseList');
        tbody.innerHTML = cases.map(case_ => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-4 whitespace-nowrap">
                    <input type="checkbox" 
                        class="case-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        data-id="${case_.id}">
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        ${case_.borrower_name}
                        ${case_.is_urgent ? '<span class="material-icons text-red-500 ml-2" style="font-size: 16px;">priority_high</span>' : ''}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${case_.borrower_phone || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusColor(case_.status)}">
                        ${case_.status_display || case_.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getBusinessTypeLabel(case_.business_type)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    ${case_.loan_amount ? `${case_.loan_amount.toLocaleString()}만원` : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${case_.manager_name || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${new Date(case_.created_at).toLocaleDateString()}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="/web/cases/${case_.id}/" class="text-blue-600 hover:text-blue-900">상세보기</a>
                    <button 
                        class="ml-2 text-red-600 hover:text-red-900 delete-btn"
                        onclick="caseList.deleteCase(${case_.id})"
                    >
                        삭제
                    </button>
                </td>
            </tr>
        `).join('');
    }

// getQueryParams 메서드 추가
getQueryParams() {
    const formData = new FormData(document.getElementById('filterForm'));
    const params = new URLSearchParams();

    for (let [key, value] of formData.entries()) {
        if (value) params.append(key, value);
    }

    params.append('page', this.currentPage);
    params.append('page_size', this.pageSize);

    return params.toString();
}

// 페이지네이션 관련 메서드들도 추가
renderPagination() {
    const pagination = document.getElementById('pagination');
    let html = '';

    // 이전 페이지 버튼
    html += `
        <button 
            class="px-3 py-2 rounded-md ${this.currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}"
            ${this.currentPage === 1 ? 'disabled' : ''}
            onclick="caseList.changePage(${this.currentPage - 1})"
        >
            이전
        </button>
    `;

    // 페이지 번호
    for (let i = 1; i <= this.totalPages; i++) {
        if (
            i === 1 ||
            i === this.totalPages ||
            (i >= this.currentPage - 2 && i <= this.currentPage + 2)
        ) {
            html += `
                <button 
                    class="px-3 py-2 rounded-md ${i === this.currentPage ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}"
                    onclick="caseList.changePage(${i})"
                >
                    ${i}
                </button>
            `;
        } else if (
            i === this.currentPage - 3 ||
            i === this.currentPage + 3
        ) {
            html += '<span class="px-2">...</span>';
        }
    }

    // 다음 페이지 버튼
    html += `
        <button 
            class="px-3 py-2 rounded-md ${this.currentPage === this.totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}"
            ${this.currentPage === this.totalPages ? 'disabled' : ''}
            onclick="caseList.changePage(${this.currentPage + 1})"
        >
            다음
        </button>
    `;

    pagination.innerHTML = html;
}

changePage(page) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadCases();
}

resetFilters() {
    document.getElementById('filterForm').reset();
    this.currentPage = 1;
    this.loadCases();
}
}

// 전역 변수로 인스턴스 생성
let caseList;
document.addEventListener('DOMContentLoaded', () => {
    caseList = new CaseListManager();
});