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
        if (data.is_owner) { window.location.href = '/reports.html'; return false; }
        document.getElementById('username').textContent = data.username;
        return data;
    } catch { window.location.href = '/login.html'; return false; }
}

async function loadReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const tbody = document.getElementById('report-table-body');
    const countEl = document.getElementById('record-count');

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px;">
        <span class="spinner"></span> Loading...
    </td></tr>`;

    let url = '/api/reports/summary';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += '?' + params.join('&');

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();

        // Only show sales (backend already filters but double check)
        const sales = data.data.filter(r => r.type === 'sale');
        countEl.textContent = `${sales.length} records`;

        if (sales.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5"
                style="text-align:center; color:#aaa; padding:30px;">
                No sales records found
            </td></tr>`;
            return;
        }

        tbody.innerHTML = sales.map(row => `
            <tr>
                <td>${row.date}</td>
                <td>${row.product}</td>
                <td>${row.category || '-'}</td>
                <td>KES ${Number(row.amount).toLocaleString()}</td>
                <td>${row.quantity}</td>
            </tr>
        `).join('');

    } catch (err) {
        showToast('Failed to load report', 'error');
        tbody.innerHTML = `<tr><td colspan="5"
            style="text-align:center; color:#e94560; padding:30px;">
            Failed to load records
        </td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
});