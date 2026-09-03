let currentPage = 1;
let totalPages = 1;

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

async function loadUserInfo() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) { window.location.href = '/login.html'; return false; }
        const data = await res.json();
        if (!data.authenticated) { window.location.href = '/login.html'; return false; }
        if (!data.is_owner) { window.location.href = '/staff-dashboard.html'; return false; }
        document.getElementById('username').textContent = data.username;
        return data;
    } catch { window.location.href = '/login.html'; return false; }
}

const colorMap = {
    'info':    { bg: '#eff6ff', border: '#4facfe', icon: '#4facfe' },
    'success': { bg: '#f0fdf4', border: '#11998e', icon: '#11998e' },
    'warning': { bg: '#fffbeb', border: '#f59e0b', icon: '#f59e0b' },
    'danger':  { bg: '#fef2f2', border: '#e94560', icon: '#e94560' }
};

function renderLogs(logs, append = false) {
    const timeline = document.getElementById('audit-timeline');

    if (!append && logs.length === 0) {
        timeline.innerHTML = `<div style="text-align:center; padding:40px; color:#aaa;">
            <i class="fas fa-history" style="font-size:2rem; margin-bottom:12px; display:block;"></i>
            No activity recorded yet
        </div>`;
        return;
    }

    const html = logs.map(log => {
        const c = colorMap[log.color] || colorMap['info'];
        const roleLabel = log.role === 'owner'
            ? `<span style="background:#e8f0ff; color:#667eea; padding:2px 8px;
                            border-radius:10px; font-size:0.72rem; font-weight:600;">
                Owner</span>`
            : `<span style="background:#fde8ec; color:#e94560; padding:2px 8px;
                            border-radius:10px; font-size:0.72rem; font-weight:600;">
                Staff</span>`;
        return `
        <div style="display:flex; gap:16px; margin-bottom:16px; align-items:flex-start;">
            <div style="width:38px; height:38px; border-radius:50%;
                        background:${c.bg}; border:2px solid ${c.border};
                        display:flex; align-items:center; justify-content:center;
                        flex-shrink:0;">
                <i class="fas ${log.icon}" style="color:${c.icon}; font-size:0.9rem;"></i>
            </div>
            <div style="flex:1; background:${c.bg}; border:1px solid ${c.border}20;
                        border-radius:10px; padding:12px 16px;">
                <div style="display:flex; justify-content:space-between;
                             align-items:center; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <strong style="font-size:0.9rem; color:#1a1a2e;">
                            ${log.user}
                        </strong>
                        ${roleLabel}
                    </div>
                    <span style="font-size:0.78rem; color:#888;">
                        <i class="fas fa-clock"></i> ${log.timestamp}
                    </span>
                </div>
                <div style="margin-top:6px; font-size:0.88rem; color:#444;">
                    ${log.details || log.action}
                </div>
                <div style="margin-top:4px; font-size:0.75rem; color:#aaa;">
                    <i class="fas fa-network-wired"></i> ${log.ip}
                </div>
            </div>
        </div>`;
    }).join('');

    if (append) {
        timeline.innerHTML += html;
    } else {
        timeline.innerHTML = html;
    }
}

async function loadAuditLog(page = 1, append = false) {
    try {
        const res = await fetch(`/api/audit?page=${page}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();

        totalPages = data.pages;
        currentPage = data.current_page;

        document.getElementById('log-count').textContent =
            `${data.total} total actions`;

        renderLogs(data.logs, append);

        const loadMoreWrap = document.getElementById('load-more-wrap');
        loadMoreWrap.style.display =
            currentPage < totalPages ? 'block' : 'none';

    } catch (err) {
        document.getElementById('audit-timeline').innerHTML = `
            <div style="text-align:center; padding:30px; color:#e94560;">
                Failed to load audit log
            </div>`;
    }
}

function loadMore() {
    loadAuditLog(currentPage + 1, true);
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    loadAuditLog();
});