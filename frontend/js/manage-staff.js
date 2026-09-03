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

async function loadStaff() {
    const tbody = document.getElementById('staff-table-body');
    const countEl = document.getElementById('staff-count');

    try {
        const res = await fetch('/api/staff');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();

        countEl.textContent = `${data.staff.length} members`;

        if (data.staff.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5"
                style="text-align:center; padding:30px; color:#aaa;">
                No staff members yet. Add one above.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = data.staff.map(s => `
            <tr id="staff-row-${s.id}">
                <td>
                    <i class="fas fa-user-tie" style="color:#667eea; margin-right:8px;"></i>
                    <strong>${s.username}</strong>
                </td>
                <td>${s.email}</td>
                <td>${s.created_at}</td>
                <td>
                    <span id="status-badge-${s.id}" style="
                        padding:4px 12px; border-radius:20px; font-size:0.78rem;
                        font-weight:600;
                        background:${s.is_active ? '#d4edda' : '#fde8ec'};
                        color:${s.is_active ? '#155724' : '#c0392b'};">
                        ${s.is_active ? 'Active' : 'Disabled'}
                    </span>
                </td>
                <td style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button onclick="toggleStaff(${s.id}, ${s.is_active})"
                        id="toggle-btn-${s.id}"
                        style="padding:5px 12px; border-radius:6px; cursor:pointer;
                               font-size:0.82rem; font-weight:600; border:none;
                               background:${s.is_active ? '#fff3cd' : '#d4edda'};
                               color:${s.is_active ? '#856404' : '#155724'};">
                        <i class="fas fa-${s.is_active ? 'ban' : 'check'}"></i>
                        ${s.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="deleteStaff(${s.id}, '${s.username}')"
                        style="padding:5px 12px; background:#fde8ec; color:#e94560;
                               border:none; border-radius:6px; cursor:pointer;
                               font-size:0.82rem; font-weight:600;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5"
            style="text-align:center; padding:30px; color:#e94560;">
            Failed to load staff members
        </td></tr>`;
    }
}

async function createStaff() {
    const username = document.getElementById('new-username').value.trim();
    const email = document.getElementById('new-email').value.trim();
    const password = document.getElementById('new-password').value.trim();
    const alertEl = document.getElementById('create-alert');

    if (!username || !email || !password) {
        alertEl.innerHTML = `<div class="alert alert-error">All fields are required</div>`;
        return;
    }

    try {
        const res = await fetch('/api/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (data.success) {
            alertEl.innerHTML = `<div class="alert alert-success">
                ✅ Staff account created for ${username}
            </div>`;
            document.getElementById('new-username').value = '';
            document.getElementById('new-email').value = '';
            document.getElementById('new-password').value = '';
            showToast('Staff account created!', 'success');
            loadStaff();
        } else {
            alertEl.innerHTML = `<div class="alert alert-error">❌ ${data.error}</div>`;
        }
    } catch (err) {
        alertEl.innerHTML = `<div class="alert alert-error">❌ Failed to create account</div>`;
    }
}

async function toggleStaff(staffId, currentlyActive) {
    try {
        const res = await fetch(`/api/staff/${staffId}/toggle`, { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            const badge = document.getElementById(`status-badge-${staffId}`);
            const btn = document.getElementById(`toggle-btn-${staffId}`);

            if (data.is_active) {
                badge.style.background = '#d4edda';
                badge.style.color = '#155724';
                badge.textContent = 'Active';
                btn.style.background = '#fff3cd';
                btn.style.color = '#856404';
                btn.innerHTML = '<i class="fas fa-ban"></i> Disable';
                btn.onclick = () => toggleStaff(staffId, true);
            } else {
                badge.style.background = '#fde8ec';
                badge.style.color = '#c0392b';
                badge.textContent = 'Disabled';
                btn.style.background = '#d4edda';
                btn.style.color = '#155724';
                btn.innerHTML = '<i class="fas fa-check"></i> Enable';
                btn.onclick = () => toggleStaff(staffId, false);
            }

            showToast(data.message, 'success');
        }
    } catch (err) {
        showToast('Failed to update staff account', 'error');
    }
}

async function deleteStaff(staffId, username) {
    if (!confirm(`Permanently delete account for "${username}"? This cannot be undone.`)) return;

    try {
        const res = await fetch(`/api/staff/${staffId}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            document.getElementById(`staff-row-${staffId}`).remove();
            showToast('Staff account deleted', 'success');
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('Failed to delete account', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    loadStaff();
});