function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function formatKES(value) {
    return 'KES ' + Number(value).toLocaleString('en-KE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

async function loadUserInfo() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) { window.location.href = '/login.html'; return false; }
        const data = await res.json();
        if (!data.authenticated) { window.location.href = '/login.html'; return false; }
        // Redirect owners to owner dashboard
        if (data.is_owner) { window.location.href = '/dashboard.html'; return false; }
        document.getElementById('username').textContent = data.username;
        document.getElementById('business-name').textContent = data.business_name;
        return data;
    } catch { window.location.href = '/login.html'; return false; }
}

async function loadKPIs() {
    try {
        const res = await fetch('/api/dashboard/kpis');
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Failed to load dashboard', 'error');
            document.getElementById('kpi-today').textContent = 'Error';
            document.getElementById('kpi-week').textContent = 'Error';
            return;
        }

        document.getElementById('kpi-today').textContent =
            formatKES(data.today_sales);
        document.getElementById('kpi-week').textContent =
            formatKES(data.week_sales);
        document.getElementById('business-name').textContent =
            data.business_name || '';

    } catch (err) {
        showToast('Could not load dashboard data', 'error');
        document.getElementById('kpi-today').textContent = 'KES 0';
        document.getElementById('kpi-week').textContent = 'KES 0';
    }
}

async function loadSalesTrend() {
    try {
        const res = await fetch('/api/dashboard/sales-trend?days=7');
        if (!res.ok) return;
        const data = await res.json();

        const ctx = document.getElementById('salesTrendChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Daily Sales (KES)',
                    data: data.values,
                    backgroundColor: 'rgba(233, 69, 96, 0.7)',
                    borderColor: '#e94560',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => 'KES ' + v.toLocaleString() }
                    }
                }
            }
        });
    } catch (err) {
        showToast('Failed to load sales trend', 'error');
    }
}

async function loadTopProducts() {
    try {
        const res = await fetch('/api/dashboard/top-products');
        if (!res.ok) return;
        const data = await res.json();
        const tbody = document.getElementById('top-products-body');

        if (data.labels.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4"
                style="text-align:center; padding:20px; color:#aaa;">
                No sales data yet
            </td></tr>`;
            return;
        }

        tbody.innerHTML = data.labels.map((name, i) => `
            <tr>
                <td><strong>#${i + 1}</strong></td>
                <td>${name}</td>
                <td>${data.quantities[i].toLocaleString()} units</td>
                <td>KES ${data.values[i].toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Failed to load top products', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    loadKPIs();
    loadSalesTrend();
    loadTopProducts();
});