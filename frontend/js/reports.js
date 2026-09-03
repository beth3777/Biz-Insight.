
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Auth guard - redirects to login if not authenticated
async function loadUserInfo() {
    try {
        const res = await fetch('/api/me');
        if (res.status === 401 || !res.ok) {
            window.location.href = '/login.html';
            return false;
        }
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = '/login.html';
            return false;
        }
        const usernameEl = document.getElementById('username');
        if (usernameEl) usernameEl.textContent = data.username;

        const businessEl = document.getElementById('business-name');
        if (businessEl) businessEl.textContent = data.business_name;

        return data;
    } catch (err) {
        window.location.href = '/login.html';
        return false;
    }
}

let categoryChart = null;

async function loadReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const tbody = document.getElementById('report-table-body');
    const countEl = document.getElementById('record-count');

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">
        <span class="spinner"></span> Loading...
    </td></tr>`;

    let url = '/api/reports/summary';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += '?' + params.join('&');

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        countEl.textContent = `${data.data.length} records`;

        if (data.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#aaa; padding:30px;">
                No records found for the selected period
            </td></tr>`;
            document.getElementById('chart-card').style.display = 'none';
            return;
        }

        // Build table
        tbody.innerHTML = data.data.map(row => `
            <tr>
                <td>${row.date}</td>
                <td>${row.product}</td>
                <td>${row.category || '-'}</td>
                <td>KES ${Number(row.amount).toLocaleString()}</td>
                <td>${row.quantity}</td>
                <td><span class="badge badge-${row.type}">${row.type}</span></td>
            </tr>
        `).join('');

        // Build category pie chart (sales only)
        const sales = data.data.filter(r => r.type === 'sale');
        const categoryTotals = {};
        sales.forEach(r => {
            const cat = r.category || 'Uncategorized';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + r.amount;
        });

        const labels = Object.keys(categoryTotals);
        const values = Object.values(categoryTotals);

        if (labels.length > 0) {
            document.getElementById('chart-card').style.display = 'block';
            const ctx = document.getElementById('categoryChart').getContext('2d');
            if (categoryChart) categoryChart.destroy();

            categoryChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            '#e94560','#667eea','#11998e',
                            '#f093fb','#4facfe','#f5576c',
                            '#764ba2','#38ef7d','#00f2fe','#ffecd2'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: ctx => `KES ${Number(ctx.raw).toLocaleString()}`
                            }
                        }
                    }
                }
            });
        }

    } catch (err) {
        showToast('Failed to load report', 'error');
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#e94560; padding:30px;">
            Failed to load records
        </td></tr>`;
    }
}

function exportReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    let url = '/api/reports/export';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += '?' + params.join('&');

    window.location.href = url;
    showToast('Downloading report...', 'info');
}
function exportPDF() {
    window.location.href = '/api/reports/export-pdf';
    showToast('Generating PDF report...', 'info');
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadReport(); // Load all records on page open
});