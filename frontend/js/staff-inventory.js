let allInventory = [];

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
        if (data.is_owner) { window.location.href = '/inventory.html'; return false; }
        document.getElementById('username').textContent = data.username;
        return data;
    } catch { window.location.href = '/login.html'; return false; }
}

function getStatusBadge(status) {
    const map = {
        'good':     { label: '✅ Good',      bg: '#d4edda', color: '#155724' },
        'medium':   { label: '⚠️ Medium',    bg: '#fff3cd', color: '#856404' },
        'low':      { label: '🔴 Low Stock', bg: '#fde8ec', color: '#c0392b' },
        'no_sales': { label: '⚫ No Sales',  bg: '#e2e3e5', color: '#383d41' }
    };
    const s = map[status] || map['no_sales'];
    return `<span style="padding:4px 10px; border-radius:20px; font-size:0.78rem;
                font-weight:600; background:${s.bg}; color:${s.color};">${s.label}</span>`;
}

function filterTable() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const filtered = allInventory.filter(i =>
        i.product_name.toLowerCase().includes(search)
    );
    renderTable(filtered);
}

function renderTable(data) {
    const tbody = document.getElementById('inventory-body');
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"
            style="text-align:center; padding:30px; color:#aaa;">
            No products found
        </td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(item => `
        <tr>
            <td><strong>${item.product_name}</strong></td>
            <td>${item.category}</td>
            <td>KES ${item.selling_price.toLocaleString()}</td>
            <td>${item.recent_sales_7d} units</td>
            <td>${getStatusBadge(item.status)}</td>
        </tr>
    `).join('');
}

async function loadInventory() {
    try {
        const res = await fetch('/api/inventory');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        allInventory = data.inventory;
        renderTable(allInventory);
    } catch (err) {
        showToast('Failed to load inventory', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    loadInventory();
});