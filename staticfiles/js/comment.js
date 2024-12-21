// comment.js

class CommentManager {
    constructor() {
        this.comments = [];
        this.isInitialized = false;
        this.eventListenersAttached = false; // 이벤트 리스너 등록 상태 추적
        this.isLoading = false; // 로딩 상태 추적
        
        // 싱글톤 패턴 적용
        if (window.commentManager) {
            return window.commentManager;
        }
        window.commentManager = this;
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
        console.group('Comment Manager Initialize');
        try {
            if (this.isInitialized) {
                console.log('Already initialized, skipping...');
                return;
            }

            // DOM 요소 초기화 전 로그
            console.log('Starting Comment Manager initialization');

            this.initializeDOMElements();
            console.log('DOM elements:', {
                form: this.commentForm,
                list: this.commentList,
                content: this.commentContent
            });

            this.initializeEndpoints();
            console.log('Endpoints initialized:', this.endpoints);

            this.setupEventListeners();
            console.log('Event listeners set up');

            // 데이터 로드
            console.log('Loading initial comments...');
            await this.loadComments();

            this.isInitialized = true;
            console.log('Comment manager initialization complete');
            return true;
        } catch (error) {
            console.error('Comment manager initialization failed:', error);
            throw error;
        } finally {
            console.groupEnd();
        }
    }

    initializeDOMElements() {
        console.group('CommentManager DOM Elements');
        this.commentContainer = document.getElementById('comments');
        this.commentForm = document.getElementById('commentForm');
        this.commentContent = document.getElementById('commentContent');
        this.commentList = document.getElementById('commentList');
        
        console.log({
            container: this.commentContainer,
            form: this.commentForm,
            content: this.commentContent,
            list: this.commentList
        });
        console.groupEnd();

        // DOM 요소가 없으면 초기화 중단해야 함
        if (!this.commentList || !this.commentForm) {
            throw new Error('Required DOM elements for comments not found');
        }
    }

    initializeEndpoints() {
        const baseUrl = `/api/cases/${window.loanCaseApp.caseId}/comments`;  // 마지막 슬래시 제거
        this.endpoints = {
            list: baseUrl + '/',
            detail: (commentId) => `${baseUrl}/${commentId}/`,
            markRead: baseUrl + '/mark-read/'
        };
    }

    setupEventListeners() {
        if (this.eventListenersAttached) return; // 이미 등록된 경우 중복 등록 방지
        
        this.commentForm?.addEventListener('submit', (e) => {
            e.preventDefault(); // form 기본 동작 방지
            this.handleSubmit();
        });

        this.commentList?.addEventListener('click', (e) => {
            if (e.target.matches('.delete-comment-btn')) {
                const commentId = e.target.dataset.id;
                this.deleteComment(commentId);
            } else if (e.target.matches('.reply-btn')) {
                const parentId = e.target.dataset.id;
                this.handleReply(parentId);
            }
        });

        this.commentList?.addEventListener('mouseenter', () => {
            this.markCommentsAsRead();
        }, { once: true });

        this.eventListenersAttached = true;
    }

    async loadComments() {
        try {
            console.log('Loading comments from:', this.endpoints.list);
            const response = await window.authUtils.fetchWithAuth(this.endpoints.list);
            console.log('Comments loaded:', response);

            if (response?.comments) {
                this.comments = response.comments;
                console.log('Comments array:', this.comments);
                await this.renderComments();
            }
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    }

    renderComments() {
        console.log('Starting to render comments');
        if (!this.commentList) {
            console.error('Comment list element not found');
            return;
        }

        this.commentList.innerHTML = '';
        if (this.comments && this.comments.length > 0) {
            this.comments.forEach(comment => {
                const html = this.renderCommentItem(comment);
                console.log('Rendered comment HTML:', html);
                this.commentList.insertAdjacentHTML('beforeend', html);
            });
            console.log('Comments rendering complete');
        } else {
            console.log('No comments to render');
        }
    }


    renderCommentItem(comment) {
        console.log('Rendering comment item:', comment);
        return `
            <div class="comment-item border-b border-gray-200 py-3">
                <div class="flex justify-between items-start">
                    <div class="text-sm text-gray-600">
                        <span class="font-medium">${comment.writer_name || '익명'}</span>
                        <span class="mx-2">·</span>
                        <time>${new Date(comment.created_at).toLocaleString()}</time>
                    </div>
                    <button class="delete-comment-btn text-red-600 text-sm" data-id="${comment.id}">삭제</button>
                </div>
                <div class="mt-2">${comment.content}</div>
            </div>
        `;
    }

    async checkNewComments() {
        try {
            const latestDate = this.comments[0]?.created_at || new Date().toISOString();
            const newComments = await window.authUtils.fetchWithAuth(
                `${this.endpoints.list}?after=${latestDate}`
            );

            if (newComments.length > 0) {
                this.handleNewComments(newComments);
            }
        } catch (error) {
            console.error('새 댓글 확인 중 오류:', error);
        }
    }

    handleNewComments(newComments) {
        this.comments = [...newComments, ...this.comments];
        this.renderComments();
        this.updateUnreadCount();
    }
    

    async handleSubmit() {
        if (!this.commentContent?.value.trim()) {
            window.authUtils.showToast('알림', '내용을 입력해주세요.', 'error');
            return;
        }

        try {
            const response = await window.authUtils.fetchWithAuth(this.endpoints.list, {
                method: 'POST',
                body: JSON.stringify({
                    content: this.commentContent.value.trim(),
                    parent: this.commentForm.dataset.replyTo || null
                })
            });
            
            // 새 댓글 추가 후 전체 목록 다시 로드
            await this.loadComments();
            
            this.commentContent.value = '';
            delete this.commentForm.dataset.replyTo;
            this.commentForm.querySelector('.reply-info')?.remove();
            
            window.authUtils.showToast('성공', '댓글이 저장되었습니다.', 'success');
            
        } catch (error) {
            window.authUtils.showToast('에러', error.message, 'error');
        }
    }

    async deleteComment(commentId) {
        try {
            // 댓글 작성자 확인 (옵션)
            const comment = this.comments.find(c => c.id === parseInt(commentId));
            if (!comment) {
                throw new Error('댓글을 찾을 수 없습니다.');
            }

            await window.authUtils.fetchWithAuth(this.endpoints.detail(commentId), {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            window.authUtils.showToast('성공', '댓글이 삭제되었습니다.', 'success');
            this.comments = this.comments.filter(comment => comment.id !== parseInt(commentId));
            this.renderComments();
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || '댓글을 삭제하지 못했습니다.';
            window.authUtils.showToast('에러', errorMessage, 'error');
        }
    }

    handleReply(parentId) {
        const parentComment = this.comments.find(c => c.id === parentId);
        if (!parentComment) return;

        this.commentForm.dataset.replyTo = parentId;

        const replyInfo = document.createElement('div');
        replyInfo.className = 'reply-info text-sm text-gray-600 mb-2';
        replyInfo.innerHTML = `
            답글 작성 중: ${parentComment.writer_name}님의 댓글에 대한 답글
            <button class="ml-2 text-red-600 hover:text-red-900">취소</button>
        `;

        replyInfo.querySelector('button').addEventListener('click', () => {
            delete this.commentForm.dataset.replyTo;
            replyInfo.remove();
        });

        this.commentForm.insertBefore(replyInfo, this.commentContent);
        this.commentContent.focus();
    }

    async markCommentsAsRead() {
        try {
            await window.authUtils.fetchWithAuth(this.endpoints.markRead, {
                method: 'POST'
            });

            this.comments = this.comments.map(comment => ({
                ...comment,
                is_read: true
            }));

            this.renderComments();
            this.updateUnreadCount();
            
        } catch (error) {
            console.error('댓글 읽음 처리 실패:', error);
        }
    }

    updateUnreadCount() {
        if (!this.unreadCount) return;

        const count = this.comments.filter(c => !c.is_read).length;
        this.unreadCount.textContent = count;
        this.unreadCount.classList.toggle('hidden', count === 0);
    }

    toggleLoadingState(isLoading) {
        const loader = this.commentList?.querySelector('.comment-loader');
        if (loader) {
            loader.classList.toggle('hidden', !isLoading);
        }
    }
}

// 초기화 코드 수정
const initCommentManager = () => {
    if (!window.commentManager) {
        const commentManager = new CommentManager();
        commentManager.initialize();
    }
};

// DOMContentLoaded 이벤트에서 한 번만 초기화
document.addEventListener('DOMContentLoaded', initCommentManager, { once: true });

export default CommentManager;