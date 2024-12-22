document.addEventListener('DOMContentLoaded', () => {
    const feedWizardBtn = document.getElementById('feedWizardBtn');
    const feedWizardModal = document.getElementById('feedWizardModal');
    const closeFeedWizardModal = document.getElementById('closeFeedWizardModal');
    const feedTypeButtons = document.querySelectorAll('.feed-type-btn');
    const feedTextArea = document.getElementById('feedTextArea');
    const copyFeedBtn = document.getElementById('copyFeedBtn');

    // 날짜 포매팅 함수
    const formatDate = (dateStr) => {
        if (!dateStr) return 'MM/DD(요일)';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'MM/DD(요일)';
        const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${month}/${day}(${weekDays[d.getDay()]})`;
    };

    // 금액 포매팅 함수 (쉼표 구분)
    const formatAmount = (amount) => {
        return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}만`;
    };

    // 고객명 생성 함수 (담보제공자 포함)
    const getCustomerNames = (data) => {
        if (!data.borrower_name) return 'OOO고객';
        
        // 담보제공자가 없으면 차주만 반환
        if (!data.security_providers || data.security_providers.length === 0) {
            return `${data.borrower_name}고객`;
        }

        // 차주와 담보제공자 이름 합치기
        const names = [data.borrower_name];
        names.push(...data.security_providers.map(provider => provider.name));
        return `${names.join('/')}고객`;
    };

    const loadAdditionalData = async (caseId) => {
        try {
            // 선순위 대출 정보
            const priorLoansResponse = await window.authUtils.fetchWithAuth(`/api/cases/${caseId}/prior-loans/`);
            
            // 담보제공자 정보
            const providersResponse = await window.authUtils.fetchWithAuth(`/api/cases/${caseId}/providers/`);
            
            // 이벤트 정보 (자서일정 등)
            const eventsResponse = await window.authUtils.fetchWithAuth(`/api/cases/${caseId}/events/`);
            
            return {
                prior_loans: priorLoansResponse.prior_loans || [],
                security_providers: providersResponse.providers || [],
                events: Array.isArray(eventsResponse) ? eventsResponse : eventsResponse.results || []
            };
        } catch (error) {
            console.error('추가 데이터 로드 실패:', error);
            return {};
        }
    };

    // 피드 양식 템플릿 함수들
    const feedTemplates = {
        '신용조회': (data) => {
            const customerNames = getCustomerNames(data);
            return `<신용조회 완료 후>
${customerNames} 
신용조회 완료했습니다. 
결과 값 확인 후 답변드리겠습니다. 
-
${data.referrer || '래퍼명'}`;
        },
        
        '결과 확인': (data) => {
            const customerNames = getCustomerNames(data);
            const creditScore = data.borrower_credit_score ? `N${data.borrower_credit_score}` : '미확인';
            const address = data.address_main && data.address_detail ? 
                `${data.address_main} ${data.address_detail}` : '주소 미확인';
            const priceInfo = data.price_amount ? `${data.price_type} ${formatAmount(data.price_amount)}` : '';
            
            // 선설정 대출 정보
            const priorLoans = data.prior_loans
                ?.filter(loan => loan.loan_type === '선설정')
                ?.map(loan => `선설정 ${loan.financial_company} ${formatAmount(loan.amount)}`)
                .join('\n') || '';

            // 대환 정보
            const refinanceLoans = data.prior_loans
                ?.filter(loan => loan.loan_type === '대환')
                ?.map(loan => `${loan.financial_company} ${formatAmount(loan.amount)} 대환`)
                .join('\n') || '';
            
            return `<신용조회 결과 확인 후>
${customerNames}(${creditScore}점)
${address}
${priceInfo}
${priorLoans}
${refinanceLoans ? '-\n' + refinanceLoans + '\n-' : ''}
기타코멘트
심사서류 안내드릴까요?
-
${data.referrer || '래퍼명'}`;
        },

        '심사서류': (data) => {
            const customerNames = getCustomerNames(data);
            return `<심사서류 안내 후> 
${customerNames} 
심사서류 안내드렸습니다. 
최대한 빨리 서류수취하여 
심사접수 후 피드백드리겠습니다.
-
${data.referrer || '래퍼명'}`;
        },

        '심사접수': (data) => {
            const customerNames = getCustomerNames(data);
            return `<심사접수 후>
${customerNames}
심사접수 완료했습니다.  
결과 확인 후 피드백드리겠습니다
-
${data.referrer || '래퍼명'}`;
        },

        '승인': (data) => {
            const customerNames = getCustomerNames(data);
            const amount = data.loan_amount ? formatAmount(data.loan_amount) : 'OOO';
            const rate = data.interest_rate ? data.interest_rate.toFixed(2) : 'O.OO';
            
            return `<심사 승인 후>
${customerNames} 
${amount} / ${rate}% 
승인.
자서안내 드릴까요? 
-
${data.referrer || '래퍼명'}`;
        },

        '자서일정': (data) => {
            const customerNames = getCustomerNames(data);
            // 자서 이벤트 찾기
            const authEvent = data.events?.find(e => e.event_type === 'authorizing');
            // 기표 이벤트 찾기
            const journalEvent = data.events?.find(e => e.event_type === 'journalizing');
            
            return `<자서일정 확인 후>
${customerNames} 
${authEvent ? formatDate(authEvent.date) : 'MM/DD(요일)'} 내방자서 예정 
${journalEvent ? formatDate(journalEvent.date) : 'MM/DD(요일)'} 기표예정입니다.
-
${data.referrer || '래퍼명'}`;
        },

        '자서완료': (data) => {
            const customerNames = getCustomerNames(data);
            // 기표 이벤트 찾기
            const journalEvent = data.events?.find(e => e.event_type === 'journalizing');
            const missingDocs = data.missing_documents ? 
                `${data.missing_documents} 미비사항있습니다.` : 
                `${journalEvent ? formatDate(journalEvent.date) : 'MM/DD(요일)'} 기표예정입니다.`;
            
            return `<자서완료 후>
${customerNames} 
금일 자서 완료했으며, 
${missingDocs}
-
${data.referrer || '래퍼명'}`;
        },

        '기표': (data) => {
            const customerNames = getCustomerNames(data);
            const amount = data.loan_amount ? formatAmount(data.loan_amount) : 'OOO';
            const rate = data.interest_rate ? data.interest_rate.toFixed(2) : 'O.OO';
            
            return `<기표 후>
${customerNames} 
${amount} / ${rate}% 
기표완료했습니다. 
감사합니다!
-
${data.referrer || '래퍼명'}`;
        }
    };

    // window.loanCaseApp이 초기화될 때까지 기다림
    const waitForLoanCaseData = () => {
        return new Promise((resolve) => {
            if (window.loanCaseApp?.initialized) {
                resolve();
                return;
            }

            document.addEventListener('appInitialized', () => {
                resolve();
            });
        });
    };

    // 피드 마법사 버튼 클릭 이벤트
    if (feedWizardBtn && feedWizardModal) {
        feedWizardBtn.addEventListener('click', async () => {
            await waitForLoanCaseData();
            
            try {
                const caseId = window.loanCaseApp.caseId;
                const [caseData, additionalData] = await Promise.all([
                    window.authUtils.fetchWithAuth(`/api/cases/${caseId}/`),
                    loadAdditionalData(caseId)
                ]);

                // 기본 데이터와 추가 데이터 병합
                window.loanCaseApp.loan_case = {
                    ...caseData.loan_case,
                    ...additionalData
                };

                const loanCaseData = window.loanCaseApp.loan_case;
                console.log('선택된 대출 건 데이터:', loanCaseData);

                // 피드 양식 선택 초기화
                feedTypeButtons.forEach(btn => {
                    btn.classList.remove('border-blue-500', 'bg-blue-50');
                });

                // 첫 번째 버튼 자동 선택
                const firstButton = feedTypeButtons[0];
                firstButton.classList.add('border-blue-500', 'bg-blue-50');

                // 첫 번째 템플릿으로 초기 텍스트 설정
                const firstFeedType = firstButton.textContent.trim();
                feedTextArea.value = feedTemplates[firstFeedType] ? 
                    feedTemplates[firstFeedType](loanCaseData) : '';

                // 모달 표시
                feedWizardModal.classList.remove('hidden');
            } catch (error) {
                console.error('데이터 로드 실패:', error);
                window.authUtils.showToast('에러', '데이터를 불러오는데 실패했습니다.', 'error');
            }
        });
    }

    // 피드 양식 선택
    feedTypeButtons.forEach(button => {
        button.addEventListener('click', async () => {
            // 데이터가 준비될 때까지 대기
            await waitForLoanCaseData();
            
            // 대출 건 데이터 가져오기
            const loanCaseData = window.loanCaseApp?.loan_case || {};

            // 버튼 선택 시각화
            feedTypeButtons.forEach(btn => btn.classList.remove('border-blue-500', 'bg-blue-50'));
            button.classList.add('border-blue-500', 'bg-blue-50');

            // 해당 양식 텍스트 영역에 삽입
            const feedType = button.textContent.trim();
            feedTextArea.value = feedTemplates[feedType] ? 
                feedTemplates[feedType](loanCaseData) : '';
        });
    });

    // 복사 기능
    copyFeedBtn.addEventListener('click', () => {
        feedTextArea.select();
        document.execCommand('copy');
        copyFeedBtn.textContent = '복사됨!';
        setTimeout(() => {
            copyFeedBtn.textContent = '복사하기';
        }, 1500);
    });

    // 모달 닫기
    closeFeedWizardModal.addEventListener('click', () => {
        feedWizardModal.classList.add('hidden');
    });
});