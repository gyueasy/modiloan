document.addEventListener('DOMContentLoaded', () => {
    const csvUploadInput = document.getElementById('csvUploadInput');
    const fileSelectedName = document.getElementById('fileSelectedName');
    const uploadCsvBtn = document.getElementById('uploadCsvBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');

    // 파일 선택 이벤트
    csvUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileSelectedName.textContent = `선택된 파일: ${file.name}`;
            uploadCsvBtn.disabled = false;
        }
    });

    // CSV 다운로드 이벤트
    downloadCsvBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/cases/export-csv/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }
            });
    
            // 응답이 CSV 파일인지 확인
            if (response.ok) {
                const blob = await response.blob();
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `cases_export_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
    
                window.authUtils.showToast('성공', 'CSV 파일이 성공적으로 다운로드되었습니다.');
            } else {
                // 오류 처리
                const errorText = await response.text();
                console.error('CSV 다운로드 오류:', errorText);
                window.authUtils.showToast('에러', 'CSV 다운로드에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('CSV 다운로드 중 오류:', error);
            window.authUtils.showToast('에러', 'CSV 다운로드에 실패했습니다.', 'error');
        }
    });

    uploadCsvBtn.addEventListener('click', async () => {
        const file = csvUploadInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('csv_file', file);

        try {
            const response = await window.authUtils.fetchWithAuth('/api/cases/import-csv/', {
                method: 'POST',
                body: formData,
                headers: {
                    // FormData를 보낼 때는 Content-Type 헤더 제거 필요
                    'Content-Type': undefined
                }
            });

            if (response && response.success) {
                window.authUtils.showToast('성공', `${response.imported_count}건의 데이터가 성공적으로 업로드되었습니다.`);

                // 파일 입력 초기화
                csvUploadInput.value = '';
                fileSelectedName.textContent = '';
                uploadCsvBtn.disabled = true;
            } else {
                throw new Error('업로드 실패');
            }
        } catch (error) {
            console.error('CSV 업로드 중 오류:', error);
            window.authUtils.showToast('에러', 'CSV 업로드에 실패했습니다.', 'error');
        }
    });
});