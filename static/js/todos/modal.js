class TodoModal {
    constructor() {
        this.modal = document.getElementById('todoModal');
        this.form = document.getElementById('todoForm');
        this.saveBtn = document.getElementById('saveTodoBtn');
        this.closeButtons = this.modal.querySelectorAll('.close-modal');
        this.currentLoanCaseId = null;
        this.fields = {
            id: document.getElementById('todoId'),
            loanCase: document.getElementById('loanCase'),
            title: document.getElementById('todoTitle'),
            content: document.getElementById('todoContent'),
            priority: document.getElementById('todoPriority'),
            status: document.getElementById('todoStatus'),
            assignedTo: document.getElementById('todoAssignedTo'),
            deadline: document.getElementById('todoDeadline')
        };

        this.initializeEventListeners();
    }

    async initialize() {
        await this.loadLoanCases();
        await this.loadUsers();
    }

    async loadLoanCases() {
        try {
            const data = await window.authUtils.fetchWithAuth('/api/cases/');
            console.log('Loaded loan cases data:', data);
            
            if (!data || !Array.isArray(data)) {
                console.log('No loan cases data available or invalid format');
                return;
            }
            
            this.fields.loanCase.innerHTML = `
                <option value="">대출건 선택</option>
                ${data.map(loan => `
                    <option value="${loan.id}">${loan.borrower_name} (${loan.status_display})</option>
                `).join('')}
            `;
        } catch (error) {
            console.error('대출 건 로드 실패:', error);
        }
    }

    async loadUsers() {
        try {
            const data = await window.authUtils.fetchWithAuth('/api/cases/');
            if (!data || !data.results) return;
            
            const managers = [...new Set(data.results
                .filter(case_ => case_.manager)
                .map(case_ => case_.manager)
            )];
            
            this.fields.assignedTo.innerHTML = `
                <option value="">담당자 선택</option>
                ${managers.map(manager => `
                    <option value="${manager}">${manager}</option>
                `).join('')}
            `;
        } catch (error) {
            console.error('사용자 로드 실패:', error);
        }
    }

    setLoanCase(loanCaseId) {
        this.currentLoanCaseId = loanCaseId;
        if (this.fields.loanCase) {
            this.fields.loanCase.value = loanCaseId;
            this.fields.loanCase.disabled = true;
        }
    }

    open(todoData = null) {
        if (todoData) {
            this.fillFormData(todoData);
            this.modal.querySelector('h2').textContent = '할일 수정';
        } else {
            this.resetForm();
            this.modal.querySelector('h2').textContent = '새 할일';
            
            // 현재 loan case ID 설정
            if (this.currentLoanCaseId) {
                this.fields.loanCase.value = this.currentLoanCaseId;
                this.fields.loanCase.disabled = true;
            }
        }
        this.modal.classList.remove('hidden');
    }

    close() {
        this.modal.classList.add('hidden');
        this.resetForm();
    }

    fillFormData(data) {
        this.fields.id.value = data.id;
        this.fields.loanCase.value = data.loan_case;
        this.fields.title.value = data.title;
        this.fields.content.value = data.content;
        this.fields.priority.value = data.priority;
        this.fields.status.value = data.status;
        this.fields.assignedTo.value = data.assigned_to || '';
        if (data.deadline) {
            this.fields.deadline.value = data.deadline.slice(0, 16);
        }
    }

    resetForm() {
        this.fields.id.value = '';
        this.form.reset();
        
        // currentLoanCaseId가 있다면 유지
        if (this.currentLoanCaseId) {
            this.fields.loanCase.value = this.currentLoanCaseId;
            this.fields.loanCase.disabled = true;
        } else {
            this.fields.loanCase.disabled = false;
        }
    }

    getFormData() {
        return {
            loan_case: this.fields.loanCase.value,
            title: this.fields.title.value,
            content: this.fields.content.value,
            priority: this.fields.priority.value,
            status: this.fields.status.value,
            assigned_to: this.fields.assignedTo.value || null,
            deadline: this.fields.deadline.value ? new Date(this.fields.deadline.value).toISOString() : null
        };
    }

    initializeEventListeners() {
        this.closeButtons.forEach(button => {
            button.addEventListener('click', () => this.close());
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        this.saveBtn.addEventListener('click', async () => {
            const data = this.getFormData();
            const id = this.fields.id.value;

            try {
                const response = await window.authUtils.fetchWithAuth(
                    `/api/todos/${id ? `${id}/` : ''}`,
                    {
                        method: id ? 'PUT' : 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    }
                );

                if (response) {
                    window.authUtils.showToast('성공', '할일이 저장되었습니다.', 'success');
                    this.close();
                    if (typeof window.loadTodos === 'function') {
                        window.loadTodos();
                    }
                }
            } catch (error) {
                console.error('할일 저장 실패:', error);
                window.authUtils.showToast('오류', '할일 저장에 실패했습니다.', 'error');
            }
        });
    }
}

class TemplateModal {
    constructor() {
        this.modal = document.getElementById('templateModal');
        this.form = document.getElementById('templateForm');
        this.createBtn = document.getElementById('createFromTemplateBtn');
        this.closeButtons = this.modal.querySelectorAll('.close-modal');
        
        this.fields = {
            template: document.getElementById('templateSelect'),
            loanCase: document.getElementById('templateLoanCase'),
            deadline: document.getElementById('templateDeadline')
        };

        console.log('Template Modal Fields:', this.fields);
        this.initializeEventListeners();
    }

    async initialize() {
        await this.loadTemplates();
        await this.loadLoanCases();
        console.log('Template modal initialized');
    }

    async loadTemplates() {
        try {
            const data = await window.authUtils.fetchWithAuth('/api/todos/templates/');
            if (!data) return;
            
            this.fields.template.innerHTML = `
                <option value="">템플릿 선택</option>
                ${data.map(template => `
                    <option value="${template.id}">${template.title}</option>
                `).join('')}
            `;
        } catch (error) {
            console.error('템플릿 로드 실패:', error);
        }
    }

    async loadLoanCases() {
        try {
            const data = await window.authUtils.fetchWithAuth('/api/cases/');
            if (!data || !Array.isArray(data)) return;
            
            this.fields.loanCase.innerHTML = `
                <option value="">대출건 선택</option>
                ${data.map(loan => `
                    <option value="${loan.id}">
                        ${loan.borrower_name} (${loan.status_display})
                    </option>
                `).join('')}
            `;

            // 현재 대출 건 ID 자동 설정
            const loanCaseId = document.getElementById('loanCaseId')?.value;
            if (loanCaseId) {
                this.fields.loanCase.value = loanCaseId;
            }
        } catch (error) {
            console.error('대출 건 로드 실패:', error);
        }
    }

    open() {
        // 현재 대출 건 ID 자동 설정
        const loanCaseId = document.getElementById('loanCaseId')?.value;
        if (loanCaseId) {
            this.fields.loanCase.value = loanCaseId;
        }
        this.modal.classList.remove('hidden');
    }

    close() {
        this.modal.classList.add('hidden');
        this.form.reset();
        
        // 현재 대출 건 ID 자동 설정
        const loanCaseId = document.getElementById('loanCaseId')?.value;
        if (loanCaseId) {
            this.fields.loanCase.value = loanCaseId;
        }
    }

    initializeEventListeners() {
        this.closeButtons.forEach(button => {
            button.addEventListener('click', () => this.close());
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        this.createBtn.addEventListener('click', async () => {
            const templateId = this.fields.template.value;
            const loanCaseId = this.fields.loanCase.value;
            const deadline = this.fields.deadline.value;

            console.log('Creating from template:', {
                templateId,
                loanCaseId,
                deadline
            });

            if (!templateId || !loanCaseId) {
                window.authUtils.showToast('경고', '템플릿과 대출건을 선택해주세요.', 'error');
                return;
            }

            try {
                const response = await window.authUtils.fetchWithAuth(
                    '/api/todos/create_from_template/',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            template_id: parseInt(templateId),
                            loan_case_id: parseInt(loanCaseId),
                            deadline: deadline ? new Date(deadline).toISOString() : null
                        })
                    }
                );

                if (response) {
                    window.authUtils.showToast('성공', '할일이 생성되었습니다.', 'success');
                    this.close();
                    if (typeof window.loadTodos === 'function') {
                        window.loadTodos();
                    }
                }
            } catch (error) {
                console.error('템플릿으로부터 할일 생성 실패:', error);
                window.authUtils.showToast('오류', '할일 생성에 실패했습니다.', 'error');
            }
        });
    }
}

// 모달 인스턴스들 생성 및 내보내기
export const todoModal = new TodoModal();
export const templateModal = new TemplateModal();