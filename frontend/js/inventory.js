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
        document.getElementById('username').textContent = data.username;
        return data;
    } catch { window.location.href = '/login.html'; return false; }
}

async function loadSummary() {
    try {
        const res = await fetch('/api/inventory/summary');
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('total-products').textContent = data.total_products;
        document.getElementById('low-stock-count').textContent = data.low_stock_count;
    } catch (err) {
        console.error('Failed to load summary', err);
    }
}

function getStatusBadge(status) {
    const map = {
        'good':     { label: 'Good',     color: '#d4edda', text: '#155724' },
        'medium':   { label: 'Medium',   color: '#fff3cd', text: '#856404' },
        'low':      { label: 'Low Stock', color: '#fde8ec', text: '#c0392b' },
        'no_sales': { label: 'No Sales', color: '#e2e3e5', text: '#383d41' }
    };
    const s = map[status] || map['no_sales'];
    return `<span style="
        padding:4px 10px; border-radius:20px; font-size:0.78rem;
        font-weight:600; background:${s.color}; color:${s.text};
    ">${s.label}</span>`;
}

function renderTable(data) {
    const tbody = document.getElementById('inventory-body');
    const countEl = document.getElementById('showing-count');

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#aaa;">
            No products found
        </td></tr>`;
        countEl.textContent = '';
        return;
    }

    countEl.textContent = `${data.length} products`;
    tbody.innerHTML = data.map(item => `
        <tr>
            <td><strong>${item.product_name}</strong></td>
            <td>${item.category}</td>
            <td>KES ${item.cost_price.toLocaleString()}</td>
            <td>KES ${item.selling_price.toLocaleString()}</td>
            <td>${item.total_sold.toLocaleString()}</td>
            <td>${item.recent_sales_7d}</td>
            <td>KES ${item.total_revenue.toLocaleString()}</td>
            <td>${item.last_sale}</td>
            <td>${getStatusBadge(item.status)}</td>
        </tr>
    `).join('');
}

function filterTable() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    const status = document.getElementById('status-filter').value;

    const filtered = allInventory.filter(item => {
        const matchSearch = item.product_name.toLowerCase().includes(search);
        const matchCategory = !category || item.category === category;
        const matchStatus = !status || item.status === status;
        return matchSearch && matchCategory && matchStatus;
    });

    renderTable(filtered);
}

async function loadInventory() {
    try {
        const res = await fetch('/api/inventory');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        allInventory = data.inventory;

        // Populate category filter
        const categories = [...new Set(allInventory.map(i => i.category))];
        const catFilter = document.getElementById('category-filter');
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            catFilter.appendChild(opt);
        });

        renderTable(allInventory);
    } catch (err) {
        showToast('Failed to load inventory', 'error');
        document.getElementById('inventory-body').innerHTML = `
            <tr><td colspan="9" style="text-align:center; padding:30px; color:#e94560;">
                Failed to load inventory
            </td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    loadSummary();
    loadInventory();
});