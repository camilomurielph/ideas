// ================================================================
//  UTILIDADES DE UI
// ================================================================
const toastElement = document.getElementById('toast');

export function showToast(msg, type = 'info', duration = 3500) {
    toastElement.textContent = msg;
    toastElement.className = 'toast';
    if (type === 'error') toastElement.classList.add('error');
    if (type === 'success') toastElement.classList.add('success');
    if (type === 'warning') toastElement.classList.add('warning');
    toastElement.classList.add('visible');
    clearTimeout(toastElement._hideTimer);
    toastElement._hideTimer = setTimeout(() => {
        toastElement.classList.remove('visible');
    }, duration);
}

export function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    } else {
        return new Promise((resolve, reject) => {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                resolve();
            } catch (err) { reject(err); }
        });
    }
}

export function openGemini() {
    const isIPhone = /iPhone/.test(navigator.userAgent);
    if (isIPhone) {
        const appScheme = "googlegemini://";
        const webUrl = "https://gemini.google.com";
        const win = window.open(appScheme, "_blank");
        const fallbackTimer = setTimeout(() => {
            window.open(webUrl, "_blank");
        }, 1500);
        const checkClosed = setInterval(() => {
            if (win && win.closed) {
                clearTimeout(fallbackTimer);
                clearInterval(checkClosed);
            }
        }, 500);
        setTimeout(() => {
            clearInterval(checkClosed);
        }, 3000);
    } else {
        window.open("https://gemini.google.com", "_blank");
    }
}
