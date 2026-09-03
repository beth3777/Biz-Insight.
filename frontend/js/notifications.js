async function loadNotifications() {
    try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        const alerts = data.notifications;

        const countEl = document.getElementById('notif-count');
        const listEl = document.getElementById('notif-list');

        if (alerts.length > 0) {
            countEl.style.display = 'flex';
            countEl.textContent = alerts.length;

            listEl.innerHTML = alerts.map(n => `
                <div class="notif-item ${n.type}">
                    <div class="notif-icon"><i class="fas ${n.icon}"></i></div>
                    <div>
                        <div class="notif-title">${n.title}</div>
                        <div class="notif-message">${n.message}</div>
                        <div class="notif-time"><i class="fas fa-clock"></i> ${n.time}</div>
                    </div>
                </div>
            `).join('');
        } else {
            countEl.style.display = 'none';
            listEl.innerHTML = `<div class="notif-empty">
                <i class="fas fa-check-circle" style="font-size:1.5rem; color:#11998e; display:block; margin-bottom:8px;"></i>
                All clear! No alerts at the moment.
            </div>`;
        }
    } catch (err) {
        console.error('Failed to load notifications', err);
    }
}

function toggleNotifications() {
    const panel = document.getElementById('notif-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// Close panel when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const bell = e.target.closest('.notif-bell');
    if (!bell && panel && panel.style.display === 'block') {
        panel.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', loadNotifications);