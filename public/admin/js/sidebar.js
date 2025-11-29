// public/admin/js/sidebar.js
(function() {
    function initSidebar() {
        var QR = window.QRAdmin;
        if (!QR) return;

        // Set user info
        var user = QR.getUser();
        if (user) {
            var nameEl = document.getElementById('user-name');
            var emailEl = document.getElementById('user-email');
            var avatarEl = document.getElementById('user-avatar');

            if (nameEl) nameEl.textContent = user.name || user.email;
            if (emailEl) emailEl.textContent = user.email;
            if (avatarEl) avatarEl.textContent = (user.name || user.email).charAt(0).toUpperCase();
        }

        // Logout button
        var logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = QR.logout;
        }

        // Load folders
        var foldersList = document.getElementById('folders-list');
        if (foldersList) {
            QR.api('/folders').then(function(folders) {
                var html = folders.map(function(f) {
                    return '<div class="folder-item" data-id="' + f.id + '">' +
                        '<span class="folder-dot" style="background:' + f.color + '"></span>' +
                        '<span>' + QR.escapeHtml(f.name) + '</span>' +
                        '<span class="folder-count">' + f.link_count + '</span>' +
                        '</div>';
                }).join('');
                foldersList.innerHTML = html;
            }).catch(function() {});
        }

        // Highlight current nav item
        var currentPage = location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-item').forEach(function(item) {
            var href = item.getAttribute('href');
            if (href === currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Mobile menu toggle
        var menuToggle = document.getElementById('menu-toggle');
        var sidebar = document.getElementById('sidebar');
        if (menuToggle && sidebar) {
            menuToggle.onclick = function() {
                sidebar.classList.toggle('open');
            };
        }
    }

    // Run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
})();