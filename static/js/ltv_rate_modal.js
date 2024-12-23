(function() {
    let ltvData, rateData, regionData;
    
    // 지역 키 가져오기 함수 (LoanCalculator.get_region_key 참고)
    function getRegionKey(region, tier) {
        // 서울, 경기 처리
        if (region === "서울" || region === "경기") {
            return `${region}_${tier}급지`;
        }
        // 광역시 처리
        else if (["부산", "인천", "대구", "대전", "광주", "울산"].some(city => region.includes(city))) {
            return `인천및광역시_${tier}급지`;
        }
        // 세종시 처리
        else if (region.includes("세종")) {
            return "세종_공통";
        }
        return null;
    }

    // 주소 정규화 함수
    function normalizeRegion(address) {
        if (!address) return '';
        
        const cleanAddress = address.replace(/(특별시|광역시|시|도|군|구)/g, '').trim();
        const parts = cleanAddress.split(/\s+/);
        
        // 첫 번째 부분이 서울/경기/광역시인 경우
        const firstPart = parts[0];
        if (firstPart === "서울" || firstPart === "경기") {
            return firstPart;
        }
        
        // 광역시인 경우
        if (["부산", "인천", "대구", "대전", "광주", "울산"].includes(firstPart)) {
            return firstPart;
        }
        
        // 세종시
        if (firstPart.includes("세종")) {
            return "세종";
        }
        
        return firstPart;
    }

    // 신용점수 구간 확인 함수 (LoanCalculator.get_credit_range 참고)
    function getCreditRange(score) {
        if (!score) return null;
        if (score >= 865) return "N865점 이상 (1-2구간)";
        if (score >= 790) return "N790점 이상 (3-4구간)";
        if (score >= 710) return "N710점 이상 (5-6구간)";
        if (score >= 685) return "N685점 이상 (7구간)";
        return null;
    }

    // 지역 가산금리 계산 (LoanRateCalculator.get_regional_adjustment 참고)
    function getRegionalAdjustment(region) {
        const normalizedRegion = normalizeRegion(region);
        return ["서울", "경기"].includes(normalizedRegion) ? 0.0 : 0.5;
    }

    async function loadData() {
        try {
            const responses = await Promise.all([
                fetch("{% static 'json/regional_tiers.json' %}"),
                fetch("{% static 'json/ltv_data.json' %}"),
                fetch("{% static 'json/interest_rate_data.json' %}")
            ]);
            
            [regionData, ltvData, rateData] = await Promise.all(
                responses.map(response => response.json())
            );
            
            console.log('Loaded data:', { regionData, ltvData, rateData });
            return true;
        } catch (error) {
            console.error('[LTV/금리] 데이터 로드 중 오류:', error);
            return false;
        }
    }

    function renderLtvTable(currentRegion, currentCreditScore) {
        const table = document.getElementById('regionLtvTable');
        if (!table || !ltvData) return;

        const creditScores = Object.keys(ltvData);
        const currentCreditRange = getCreditRange(currentCreditScore);
        const normalizedRegion = normalizeRegion(currentRegion);
        const currentTier = regionData[currentRegion] || 1; // 기본값 1급지

        console.log('Rendering LTV table with:', {
            currentRegion,
            normalizedRegion,
            currentTier,
            currentCreditScore,
            currentCreditRange
        });
        
        // 테이블 렌더링 코드...
        let html = `<thead>...</thead><tbody>...</tbody>`;
        table.innerHTML = html;
    }

    function renderRateTable(currentCreditScore, region) {
        const table = document.getElementById('ltvRateTable');
        if (!table || !rateData) return;

        const creditScores = Object.keys(rateData);
        const currentCreditRange = getCreditRange(currentCreditScore);
        const regionalAdjustment = getRegionalAdjustment(region);
        const ltvRanges = Object.keys(rateData[creditScores[0]]);

        let html = `
            <thead>
                <tr class="bg-purple-50">
                    <th class="p-2 border">신용점수</th>
                    ${ltvRanges.map(ltv => `<th class="p-2 border">${ltv}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
        `;

        creditScores.forEach(score => {
            const isCurrentRange = score === currentCreditRange;
            html += `
                <tr class="${isCurrentRange ? 'bg-yellow-100' : ''}">
                    <td class="p-2 border">${score}</td>
                    ${ltvRanges.map(ltv => {
                        const baseRate = parseFloat(rateData[score][ltv].replace('%', ''));
                        const totalRate = baseRate + regionalAdjustment;
                        return `
                            <td class="p-2 border text-center">
                                <div class="font-bold text-purple-600">
                                    ${totalRate.toFixed(2)}%
                                </div>
                                ${regionalAdjustment > 0 ? 
                                    `<div class="text-xs text-red-500">(+${regionalAdjustment}%)</div>` : 
                                    ''}
                            </td>
                        `;
                    }).join('')}
                </tr>
            `;
        });

        html += '</tbody>';
        table.innerHTML = html;
    }

    function updateCurrentInfo(address, creditScore) {
        document.getElementById('currentAddress').textContent = address || '-';
        document.getElementById('currentCreditScore').textContent = 
            creditScore ? `N${creditScore}점 (${getCreditRange(creditScore)})` : '-';
    }

    // 초기화 함수
    async function initModal() {
        const btn = document.getElementById('ltvRateBtn');
        const modal = document.getElementById('ltvRateModal');
        const closeBtn = document.getElementById('closeLtvRateModal');

        if (!btn || !modal || !closeBtn) {
            console.error('[LTV/금리] 필수 DOM 요소를 찾을 수 없습니다');
            return;
        }

        // 버튼 클릭 이벤트
        btn.addEventListener('click', async function() {
            console.log('[LTV/금리] 버튼 클릭됨');
            if (!ltvData) {
                const success = await loadData();
                if (!success) return;
            }

            // 현재 대출 정보 가져오기
            const loanCase = window.loanCaseApp?.loan_case;
            const address = loanCase?.address_main;
            const creditScore = loanCase?.borrower_credit_score;

            // 정보 업데이트 및 테이블 렌더링
            updateCurrentInfo(address, creditScore);
            renderLtvTable(address, creditScore);
            renderRateTable(creditScore);
            
            modal.classList.remove('hidden');
        });

        // 닫기 버튼 이벤트
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }

    // DOM 로드 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModal);
    } else {
        initModal();
    }
})();