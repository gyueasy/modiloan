// utils.js
export const formatAmount = (value) => {
    const numericValue = value.toString().replace(/[^0-9]/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatPhoneNumber = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 4) {
        formatted = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    }
    if (cleaned.length >= 7) {
        formatted = formatted.slice(0, 7) + '-' + formatted.slice(7);
    }
    if (cleaned.length > 11) {
        formatted = formatted.slice(0, 13);
    }
    
    return formatted;
};