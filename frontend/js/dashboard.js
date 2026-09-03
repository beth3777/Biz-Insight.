let salesChart = null;

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
        document.getElementById('username').textContent = data.username;
        document.getElementById('business-name').textContent = data.business_name;
        return data;
    } catch { window.location.href = '/login.html'; return false; }
}

async function loadKPIs() {
    try {
        const res = await fetch('/api/dashboard/kpis');
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('kpi-revenue').textContent = formatKES(data.total_revenue);
        document.getElementById('kpi-profit').textContent = formatKES(data.total_profit);
        document.getElementById('kpi-expenses').textContent = formatKES(data.total_expenses);
        document.getElementById('kpi-products').textContent = data.total_products;
    } catch (err) {
        showToast('Failed to load KPIs', 'error');
    }
}

async function loadSalesTrend(days = 30) {
    // Update active button style
    ['7', '30', '90'].forEach(d => {
        const btn = document.getElementById(`btn-${d}`);
        if (btn) {
            btn.style.background = d == days ? '#e94560' : 'transparent';
            btn.style.borderColor = d == days ?
                '#e94560' : 'rgba(255,255,255,0.3)';
        }
    });

    try {
        const res = await fetch(`/api/dashboard/sales-trend?days=${days}`);
        if (!res.ok) return;
        const data = await res.json();

        const ctx = document.getElementById('salesTrendChart').getContext('2d');
        if (salesChart) salesChart.destroy();

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Daily Sales (KES)',
                    data: data.values,
                    borderColor: '#e94560',
                    backgroundColor: 'rgba(233, 69, 96, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#e94560',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: v => 'KES ' + v.toLocaleString()
                        }
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

        const ctx = document.getElementById('topProductsChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Revenue (KES)',
                    data: data.values,
                    backgroundColor: [
                        '#e94560','#667eea','#11998e','#f093fb',
                        '#4facfe','#f5576c','#764ba2','#38ef7d','#00f2fe','#ffecd2'
                    ]
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { callback: v => 'KES ' + v.toLocaleString() } }
                }
            }
        });
    } catch (err) {
        showToast('Failed to load top products', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    loadKPIs();
    loadSalesTrend(30);
    loadTopProducts();
});