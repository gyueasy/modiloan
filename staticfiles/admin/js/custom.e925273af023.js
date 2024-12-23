// static/admin/js/custom.js
document.addEventListener('DOMContentLoaded', function() {
    // JSON 필드 포매팅
    const jsonFields = document.querySelectorAll('textarea[name="security_providers"], textarea[name="prior_loans"]');
    
    jsonFields.forEach(field => {
        field.addEventListener('blur', function() {
            try {
                const value = JSON.parse(this.value);
                this.value = JSON.stringify(value, null, 2);
            } catch (e) {
                console.error('Invalid JSON');
            }
        });
    });

    // 매출액에 따른 가라사업자 자동 체크
    const monthlySales = document.querySelector('#id_monthly_sales');
    const fakeBusinessCheck = document.querySelector('#id_is_fake_business');
    
    if (monthlySales && fakeBusinessCheck) {
        monthlySales.addEventListener('change', function() {
            if (parseInt(this.value) <= 500) {
                fakeBusinessCheck.checked = true;
            }
        });
    }
});