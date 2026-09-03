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

async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('business-name').value = data.business_name || '';
        document.getElementById('business-industry').value =
            data.business_industry || '';
        document.getElementById('business-currency').value =
            data.business_currency || 'KES';
    } catch (err) {
        showToast('Failed to load settings', 'error');
    }
}

async function saveBusinessSettings() {
    const alertEl = document.getElementById('business-alert');
    const payload = {
        business_name: document.getElementById('business-name').value.trim(),
        business_industry: document.getElementById('business-industry').value,
        business_currency: document.getElementById('business-currency').value
    };

    if (!payload.business_name) {
        alertEl.innerHTML = `<div class="alert alert-error">
            Business name is required</div>`;
        return;
    }

    try {
        const res = await fetch('/api/settings/business', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alertEl.innerHTML = `<div class="alert alert-success">
                ✅ ${data.message}</div>`;
            showToast('Business details saved!', 'success');
        } else {
            alertEl.innerHTML = `<div class="alert alert-error">
                ❌ ${data.error}</div>`;
        }
    } catch (err) {
        showToast('Failed to save settings', 'error');
    }
}

async function savePassword() {
    const alertEl = document.getElementById('password-alert');
    const current = document.getElementById('current-password').value;
    const newPwd = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;

    if (!current || !newPwd || !confirm) {
        alertEl.innerHTML = `<div class="alert alert-error">
            All password fields are required</div>`;
        return;
    }
    if (newPwd !== confirm) {
        alertEl.innerHTML = `<div class="alert alert-error">
            New passwords do not match</div>`;
        return;
    }
    if (newPwd.length < 6) {
        alertEl.innerHTML = `<div class="alert alert-error">
            Password must be at least 6 characters</div>`;
        return;
    }

    try {
        const res = await fetch('/api/settings/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                current_password: current,
                new_password: newPwd
            })
        });
        const data = await res.json();
        if (data.success) {
            alertEl.innerHTML = `<div class="alert alert-success">
                ✅ ${data.message}</div>`;
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            showToast('Password updated!', 'success');
        } else {
            alertEl.innerHTML = `<div class="alert alert-error">
                ❌ ${data.error}</div>`;
        }
    } catch (err) {
        showToast('Failed to update password', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    loadSettings();
});