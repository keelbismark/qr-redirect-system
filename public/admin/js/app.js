// public/admin/js/app.js
(function() {
    'use strict';

    const API = '/api';
    let accessToken = localStorage.getItem('access_token');
    let refreshToken = localStorage.getItem('refresh_token');
    let currentUser = null;
    
    try {
        currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) {
        currentUser = null;
    }

    // ===== API =====
    async function api(endpoint, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        
        if (accessToken) {
            headers['Authorization'] = 'Bearer ' + accessToken;
        }

        let res = await fetch(API + endpoint, {
            method: options.method || 'GET',
            headers,
            body: options.body
        });

        // Если 401 — пробуем обновить токен
        if (res.status === 401 && refreshToken) {
            console.log('Token expired, trying to refresh...');
            const refreshed = await tryRefreshToken();
            
            if (refreshed) {
                headers['Authorization'] = 'Bearer ' + accessToken;
                res = await fetch(API + endpoint, {
                    method: options.method || 'GET',
                    headers,
                    body: options.body
                });
            } else {
                // Не удалось обновить — выходим
                logout();
                return;
            }
        }

        const data = await res.json();
        
        if (!res.ok) {
            const err = new Error(data.error || 'Ошибка');
            err.status = res.status;
            err.data = data;
            throw err;
        }
        
        return data;
    }

    async function tryRefreshToken() {
        if (!refreshToken) return false;
        
        try {
            const res = await fetch(API + '/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!res.ok) {
                console.log('Refresh failed:', res.status);
                clearAuth();
                return false;
            }

            const data = await res.json();
            
            accessToken = data.accessToken;
            refreshToken = data.refreshToken;
            currentUser = data.user;
            
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            console.log('Token refreshed successfully');
            return true;
        } catch (e) {
            console.error('Refresh error:', e);
            clearAuth();
            return false;
        }
    }

    function clearAuth() {
        accessToken = null;
        refreshToken = null;
        currentUser = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }

    // ===== Auth =====
    async function login(email, password) {
        const res = await fetch(API + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Ошибка входа');
        }

        accessToken = data.accessToken;
        refreshToken = data.refreshToken;
        currentUser = data.user;

        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(currentUser));

        return data;
    }

    function logout() {
        // Отправляем запрос на выход (игнорируем ошибки)
        if (refreshToken && accessToken) {
            fetch(API + '/auth/logout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                body: JSON.stringify({ refreshToken })
            }).catch(() => {});
        }

        clearAuth();
        location.href = 'login.html';
    }

    function isAuthenticated() {
        return !!accessToken;
    }

    function getUser() {
        return currentUser;
    }

    // ===== Helpers =====
    function formatDate(d, full = false) {
        if (!d) return '—';
        const date = new Date(d);
        if (full) {
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    function formatNumber(n) {
        return new Intl.NumberFormat('ru-RU').format(n || 0);
    }

    function escapeHtml(t) {
        if (!t) return '';
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    function debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ===== Clipboard =====
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showAlert('Скопировано!');
            return true;
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showAlert('Скопировано!');
            return true;
        }
    }

    // ===== Alerts =====
    function showAlert(msg, type = 'success') {
        const old = document.querySelector('.toast');
        if (old) old.remove();

        const el = document.createElement('div');
        el.className = 'toast toast-' + type;
        el.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span class="toast-msg">${escapeHtml(msg)}</span>
        `;
        document.body.appendChild(el);

        requestAnimationFrame(() => el.classList.add('show'));
        
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }

    // ===== Modal =====
    function showModal(content, options = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal ${options.size || ''}">
                <div class="modal-header">
                    <h3>${options.title || ''}</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">${content}</div>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        const close = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        };

        overlay.querySelector('.modal-close').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        return { close, el: overlay };
    }

    function showConfirm(message, onConfirm) {
        const modal = showModal(`
            <p style="margin-bottom:24px;">${escapeHtml(message)}</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" data-action="cancel">Отмена</button>
                <button class="btn btn-danger" data-action="confirm">Удалить</button>
            </div>
        `, { title: 'Подтверждение' });

        modal.el.querySelector('[data-action="cancel"]').onclick = modal.close;
        modal.el.querySelector('[data-action="confirm"]').onclick = () => {
            modal.close();
            onConfirm();
        };
    }

    // ===== Loading =====
    function showLoading(container) {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Загрузка</p>
            </div>
        `;
    }

    // ===== Export =====
    window.QRAdmin = {
        api,
        login,
        logout,
        isAuthenticated,
        getUser,
        formatDate,
        formatNumber,
        escapeHtml,
        debounce,
        copyToClipboard,
        showAlert,
        showModal,
        showConfirm,
        showLoading
    };
})();