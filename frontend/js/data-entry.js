const recentEntries = [];

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

async function loadProducts() {
    try {
        const res = await fetch('/api/entry/products');
        const data = await res.json();
        const select = document.getElementById('product-select');
        data.products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} (${p.category})`;
            opt.dataset.price = p.price;
            opt.dataset.cost = p.cost;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load products', err);
    }
}

function onProductSelect() {
    const select = document.getElementById('product-select');
    const newFields = document.getElementById('new-product-fields');
    const selected = select.options[select.selectedIndex];

    if (select.value === 'new') {
        newFields.style.display = 'block';
        document.getElementById('trans-amount').value = '';
        document.getElementById('trans-cost').value = '';
    } else if (select.value) {
        newFields.style.display = 'none';
        document.getElementById('trans-amount').value = selected.dataset.price || '';
        document.getElementById('trans-cost').value = selected.dataset.cost || '';
    } else {
        newFields.style.display = 'none';
    }
}

function setType(type) {
    document.getElementById('trans-type').value = type;
    const saleBtn = document.getElementById('btn-sale');
    const expBtn = document.getElementById('btn-expense');

    if (type === 'sale') {
        saleBtn.style.background = '#d4edda';
        saleBtn.style.color = '#155724';
        expBtn.style.background = '#f0f0f0';
        expBtn.style.color = '#666';
        document.getElementById('cost-field').style.display = 'block';
    } else {
        expBtn.style.background = '#fde8ec';
        expBtn.style.color = '#c0392b';
        saleBtn.style.background = '#f0f0f0';
        saleBtn.style.color = '#666';
        document.getElementById('cost-field').style.display = 'none';
    }
}

function addToRecentList(entry) {
    recentEntries.unshift(entry);
    const container = document.getElementById('recent-entries');
    container.innerHTML = recentEntries.map(e => `
        <div style="padding:14px 18px; border-bottom:1px solid #f0f0f0;
                    display:flex; justify-content:space-between;
                    align-items:center;">
            <div>
                <div style="font-weight:600; font-size:0.9rem;
                            color:#1a1a2e;">${e.product}</div>
                <div style="font-size:0.8rem; color:#888; margin-top:2px;">
                    ${e.date} • ${e.type}
                </div>
            </div>
            <div style="font-weight:700; font-size:0.95rem;
                        color:${e.type === 'sale' ? '#11998e' : '#e94560'};">
                ${e.type === 'expense' ? '-' : '+'} KES ${Number(e.amount).toLocaleString()}
            </div>
        </div>
    `).join('');
}

async function submitTransaction() {
    const alertEl = document.getElementById('entry-alert');
    const productSelect = document.getElementById('product-select');
    const type = document.getElementById('trans-type').value;
    const date = document.getElementById('trans-date').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const quantity = parseInt(document.getElementById('trans-quantity').value) || 1;
    const cost = parseFloat(document.getElementById('trans-cost').value) || 0;

    if (!date) {
        alertEl.innerHTML = `<div class="alert alert-error">Please select a date</div>`;
        return;
    }
    if (!amount || amount <= 0) {
        alertEl.innerHTML = `<div class="alert alert-error">Please enter a valid amount</div>`;
        return;
    }

    const payload = { type, date, amount, quantity, cost };

    if (productSelect.value === 'new') {
        const newName = document.getElementById('new-product-name').value.trim();
        const category = document.getElementById('new-category').value;
        if (!newName) {
            alertEl.innerHTML = `<div class="alert alert-error">Enter a product name</div>`;
            return;
        }
        payload.new_product_name = newName;
        payload.category = category;
    } else if (productSelect.value) {
        payload.product_id = parseInt(productSelect.value);
    } else {
        alertEl.innerHTML = `<div class="alert alert-error">Please select or enter a product</div>`;
        return;
    }

    try {
        const res = await fetch('/api/entry/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            alertEl.innerHTML = `<div class="alert alert-success">
                ✅ ${data.message}</div>`;
            showToast('Transaction added!', 'success');

            // Add to recent list
            const selectedOption = productSelect.options[productSelect.selectedIndex];
            addToRecentList({
                product: payload.new_product_name ||
                         selectedOption.textContent.split(' (')[0],
                date, amount, type
            });

            // Reset form
            document.getElementById('trans-amount').value = '';
            document.getElementById('trans-quantity').value = '1';
            document.getElementById('trans-cost').value = '';
            document.getElementById('product-select').value = '';
            document.getElementById('new-product-fields').style.display = 'none';

        } else {
            alertEl.innerHTML = `<div class="alert alert-error">❌ ${data.error}</div>`;
        }
    } catch (err) {
        showToast('Failed to add transaction', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    loadProducts();
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trans-date').value = today;
});