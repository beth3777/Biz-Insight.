let forecastChart = null;

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
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
// ── SAVE & RESTORE FORECAST ──
function saveForecastToSession(data) {
    try {
        sessionStorage.setItem('bizinsight_forecast', JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save forecast to session');
    }
}

function loadForecastFromSession() {
    try {
        const saved = sessionStorage.getItem('bizinsight_forecast');
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        return null;
    }
}

async function generateForecast() {
    const btn = document.getElementById('generate-btn');
    const periods = document.getElementById('forecast-period').value;

    btn.innerHTML = '<span class="spinner"></span> Generating...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/forecast/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ periods: parseInt(periods) })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            showToast(data.error || 'Forecast failed', 'error');
            return;
        }

        document.getElementById('forecast-card').style.display = 'block';
        document.getElementById('forecast-summary').style.display = 'block';

        renderForecastChart(data);
        renderForecastTable(data);
        renderForecastStats(data);

        showToast('Forecast generated successfully!', 'success');
        saveForecastToSession(data);

    } catch (err) {
        showToast('Forecast generation failed.', 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-magic"></i> Generate Forecast';
        btn.disabled = false;
    }
}

function renderForecastChart(data) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    if (forecastChart) forecastChart.destroy();

    // Gradient fills
    const gradientHistorical = ctx.createLinearGradient(0, 0, 0, 400);
    gradientHistorical.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
    gradientHistorical.addColorStop(1, 'rgba(102, 126, 234, 0.0)');

    const gradientForecast = ctx.createLinearGradient(0, 0, 0, 400);
    gradientForecast.addColorStop(0, 'rgba(233, 69, 96, 0.3)');
    gradientForecast.addColorStop(1, 'rgba(233, 69, 96, 0.0)');

    const allLabels = [...data.historical_dates, ...data.dates];
    const histLen = data.historical_dates.length;
    const predLen = data.dates.length;

    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: 'Historical Sales',
                    data: [
                        ...data.historical_values,
                        ...Array(predLen).fill(null)
                    ],
                    borderColor: '#667eea',
                    backgroundColor: gradientHistorical,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: (ctx) => {
                        // Only show points at start and end
                        const i = ctx.dataIndex;
                        return (i === 0 || i === histLen - 1) ? 5 : 0;
                    },
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                },
                {
                    label: 'Predicted Sales',
                    data: [
                        ...Array(histLen - 1).fill(null),
                        // Connect to last historical point
                        data.historical_values[histLen - 1],
                        ...data.predicted
                    ],
                    borderColor: '#e94560',
                    backgroundColor: gradientForecast,
                    borderWidth: 2.5,
                    borderDash: [6, 3],
                    fill: true,
                    tension: 0.4,
                    pointRadius: (ctx) => {
                        const i = ctx.dataIndex;
                        return i === histLen ? 5 : 0;
                    },
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#e94560',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                },
                {
                    label: 'Upper Bound',
                    data: [
                        ...Array(histLen - 1).fill(null),
                        data.historical_values[histLen - 1],
                        ...data.upper
                    ],
                    borderColor: 'rgba(233, 69, 96, 0.25)',
                    backgroundColor: 'rgba(233, 69, 96, 0.08)',
                    borderWidth: 1,
                    fill: '+1',
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                },
                {
                    label: 'Lower Bound',
                    data: [
                        ...Array(histLen - 1).fill(null),
                        data.historical_values[histLen - 1],
                        ...data.lower
                    ],
                    borderColor: 'rgba(233, 69, 96, 0.25)',
                    backgroundColor: 'rgba(233, 69, 96, 0.08)',
                    borderWidth: 1,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        pointStyleWidth: 16,
                        padding: 20,
                        font: { size: 12 },
                        filter: (item) => {
                            // Hide upper/lower bound from legend
                            return !['Upper Bound', 'Lower Bound'].includes(item.text);
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 46, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#a8a8b3',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 10,
                    callbacks: {
                        label: (ctx) => {
                            if (ctx.parsed.y === null) return null;
                            const label = ctx.dataset.label;
                            if (['Upper Bound', 'Lower Bound'].includes(label)) return null;
                            return ` ${label}: KES ${Number(ctx.parsed.y).toLocaleString()}`;
                        },
                        afterBody: (items) => {
                            // Show confidence range in tooltip
                            const idx = items[0]?.dataIndex;
                            if (idx === undefined) return;
                            const upper = forecastChart.data.datasets[2].data[idx];
                            const lower = forecastChart.data.datasets[3].data[idx];
                            if (upper !== null && upper !== undefined &&
                                lower !== null && lower !== undefined) {
                                return [
                                    '',
                                    ` Range: KES ${Number(lower).toLocaleString()} — KES ${Number(upper).toLocaleString()}`
                                ];
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        maxTicksLimit: 12,
                        font: { size: 11 },
                        color: '#888',
                        maxRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0,0,0,0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        font: { size: 11 },
                        color: '#888',
                        callback: value => 'KES ' + Number(value).toLocaleString()
                    },
                    beginAtZero: false
                }
            }
        }
    });
}

function renderForecastStats(data) {
    const predicted = data.predicted;
    const total = predicted.reduce((a, b) => a + b, 0);
    const avg = total / predicted.length;
    const peak = Math.max(...predicted);
    const peakDate = data.dates[predicted.indexOf(peak)];

    const trendConfig = {
        'upward': {
            icon: 'fa-arrow-trend-up',
            label: 'Upward Trend',
            color: 'linear-gradient(135deg, #11998e, #38ef7d)',
            tip: 'Sales are predicted to grow. Consider increasing stock.'
        },
        'downward': {
            icon: 'fa-arrow-trend-down',
            label: 'Downward Trend',
            color: 'linear-gradient(135deg, #f093fb, #f5576c)',
            tip: 'Sales may slow down. Review your pricing or promotions.'
        },
        'stable': {
            icon: 'fa-equals',
            label: 'Stable Trend',
            color: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            tip: 'Sales are expected to remain consistent.'
        }
    };

    const trend = trendConfig[data.trend] || trendConfig['stable'];

    // Compare avg predicted vs avg historical
    const changePercent = data.avg_historical > 0
        ? (((data.avg_predicted - data.avg_historical)
            / data.avg_historical) * 100).toFixed(1)
        : 0;
    const changeLabel = changePercent > 0
        ? `+${changePercent}% vs historical avg`
        : `${changePercent}% vs historical avg`;

    const statsEl = document.getElementById('forecast-stats');
    if (statsEl) {
        statsEl.innerHTML = `
            <!-- Trend tip banner -->
            <div style="background:#f8f9ff; border:1px solid #e0e4ff;
                        border-radius:10px; padding:14px 18px;
                        margin-bottom:20px; display:flex;
                        align-items:center; gap:12px;">
                <i class="fas ${trend.icon}"
                   style="font-size:1.3rem; color:#667eea;"></i>
                <div>
                    <strong style="color:#1a1a2e;">${trend.label}</strong>
                    <p style="margin:2px 0 0; color:#666;
                               font-size:0.85rem;">${trend.tip}</p>
                </div>
            </div>

            <!-- Stats cards -->
            <div style="display:grid;
                        grid-template-columns:repeat(auto-fit, minmax(150px,1fr));
                        gap:16px;">
                <div style="background:linear-gradient(135deg,#667eea,#764ba2);
                            border-radius:10px; padding:16px;
                            color:white; text-align:center;">
                    <div style="font-size:0.75rem; opacity:0.85; margin-bottom:6px;">
                        Total Predicted
                    </div>
                    <div style="font-size:1.1rem; font-weight:700;">
                        KES ${Number(total).toLocaleString()}
                    </div>
                </div>
                <div style="background:${trend.color};
                            border-radius:10px; padding:16px;
                            color:white; text-align:center;">
                    <div style="font-size:0.75rem; opacity:0.85; margin-bottom:6px;">
                        Daily Average
                    </div>
                    <div style="font-size:1.1rem; font-weight:700;">
                        KES ${Number(avg).toLocaleString()}
                    </div>
                    <div style="font-size:0.72rem; opacity:0.8; margin-top:4px;">
                        ${changeLabel}
                    </div>
                </div>
                <div style="background:linear-gradient(135deg,#f093fb,#f5576c);
                            border-radius:10px; padding:16px;
                            color:white; text-align:center;">
                    <div style="font-size:0.75rem; opacity:0.85; margin-bottom:6px;">
                        Peak Day
                    </div>
                    <div style="font-size:1.1rem; font-weight:700;">
                        KES ${Number(peak).toLocaleString()}
                    </div>
                    <div style="font-size:0.72rem; opacity:0.8; margin-top:4px;">
                        ${peakDate}
                    </div>
                </div>
                <div style="background:linear-gradient(135deg,#4facfe,#00f2fe);
                            border-radius:10px; padding:16px;
                            color:white; text-align:center;">
                    <div style="font-size:0.75rem; opacity:0.85; margin-bottom:6px;">
                        Data Points Used
                    </div>
                    <div style="font-size:1.1rem; font-weight:700;">
                        ${data.data_points} days
                    </div>
                </div>
            </div>
        `;
    }
}

function renderForecastTable(data) {
    const tbody = document.getElementById('forecast-table-body');
    tbody.innerHTML = data.dates.map((date, i) => `
        <tr>
            <td>${date}</td>
            <td style="font-weight:600; color:#e94560;">
                KES ${Number(data.predicted[i]).toLocaleString()}
            </td>
            <td style="color:#888;">KES ${Number(data.lower[i]).toLocaleString()}</td>
            <td style="color:#888;">KES ${Number(data.upper[i]).toLocaleString()}</td>
        </tr>
    `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();

    // Restore last forecast if available
    const saved = loadForecastFromSession();
    if (saved) {
        document.getElementById('forecast-card').style.display = 'block';
        document.getElementById('forecast-summary').style.display = 'block';
        renderForecastChart(saved);
        renderForecastTable(saved);
        renderForecastStats(saved);
        showToast('Showing your last forecast. Generate new to refresh.', 'info');
    }
});