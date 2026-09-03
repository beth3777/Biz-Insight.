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
        document.getElementById('username').textContent = data.username;
        return data;
    } catch { window.location.href = '/login.html'; return false; }
}

// ── CONFIRMATION MODAL ──
function showConfirmModal(title, message, options) {
    // Remove existing modal if any
    const existing = document.getElementById('confirm-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.5);
        display:flex; align-items:center; justify-content:center;
        z-index:99999;
    `;

    modal.innerHTML = `
        <div style="background:white; border-radius:16px; padding:32px;
                    max-width:420px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 10px; color:#1a1a2e; font-size:1.1rem;">
                ${title}
            </h3>
            <p style="color:#666; font-size:0.92rem; margin:0 0 24px; line-height:1.5;">
                ${message}
            </p>
            <div id="modal-extra" style="margin-bottom:20px;"></div>
            <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
                ${options.map(o => `
                    <button data-action="${o.action}" style="
                        padding:10px 20px; border-radius:8px; cursor:pointer;
                        font-size:0.9rem; font-weight:600; border:none;
                        background:${o.style === 'danger' ? '#e94560' :
                                     o.style === 'warning' ? '#f59e0b' :
                                     o.style === 'cancel' ? '#f0f0f0' : '#1a1a2e'};
                        color:${o.style === 'cancel' ? '#555' : 'white'};
                    ">${o.label}</button>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    return new Promise((resolve) => {
        modal.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
                resolve(btn.dataset.action);
            });
        });
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve('cancel');
            }
        });
    });
}

// ── UPLOAD WITH CONFIRMATION ──
async function confirmAndUpload(file) {
    const action = await showConfirmModal(
        '📂 Confirm Upload',
        `You are about to upload <strong>${file.name}</strong>.<br><br>
         This will import all records from the file into your business data.
         Are you sure you want to continue?`,
        [
            { label: 'Cancel', action: 'cancel', style: 'cancel' },
            { label: 'Yes, Upload', action: 'confirm', style: 'primary' }
        ]
    );

    if (action === 'confirm') {
        await uploadFile(file);
    }
}

async function uploadFile(file) {
    const progressWrap = document.getElementById('progress-wrap');
    const progressBar = document.getElementById('progress-bar');
    const resultDiv = document.getElementById('upload-result');

    progressWrap.style.display = 'block';
    progressBar.style.width = '30%';
    resultDiv.innerHTML = '';

    const formData = new FormData();
    formData.append('file', file);

    try {
        progressBar.style.width = '70%';
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        progressBar.style.width = '100%';
        const data = await res.json();

        if (data.success) {
            showToast(`Successfully imported ${data.rows_imported} records!`, 'success');
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    ✅ <strong>${data.rows_imported} records imported successfully!</strong>
                    ${data.errors && data.errors.length > 0 ?
                        `<br><small>⚠️ ${data.errors.length} rows had errors and were skipped.</small>`
                        : ''}
                </div>`;
            loadUploadHistory();
        } else {
            showToast(data.error, 'error');
            resultDiv.innerHTML = `<div class="alert alert-error">❌ ${data.error}</div>`;
        }
    } catch (err) {
        showToast('Upload failed. Please try again.', 'error');
        resultDiv.innerHTML = `<div class="alert alert-error">❌ Upload failed. Please try again.</div>`;
    } finally {
        setTimeout(() => {
            progressWrap.style.display = 'none';
            progressBar.style.width = '0%';
        }, 1500);
    }
}

// ── DELETE WITH OPTIONS ──
async function deleteUpload(uploadId, filename, rowsImported) {
    const action = await showConfirmModal(
        '🗑️ Delete Upload Record',
        `You are about to delete the upload record for <strong>${filename}</strong>
         (${rowsImported} records).<br><br>
         What would you like to do with the imported data?`,
        [
            { label: 'Cancel', action: 'cancel', style: 'cancel' },
            { label: 'Keep Data', action: 'keep', style: 'primary' },
            { label: 'Delete Data Too', action: 'delete_data', style: 'danger' }
        ]
    );

    if (action === 'cancel') return;

    const deleteData = action === 'delete_data';

    try {
        const res = await fetch(
            `/api/uploads/${uploadId}?delete_data=${deleteData}`,
            { method: 'DELETE' }
        );

        const data = await res.json();

        if (data.success) {
            document.getElementById(`upload-row-${uploadId}`)?.remove();
            showToast(data.message, 'success');
        } else {
            showToast(data.error || 'Delete failed', 'error');
        }
    } catch (err) {
        showToast('Failed to delete upload. Please try again.', 'error');
    }
}

async function loadUploadHistory() {
    const tbody = document.getElementById('history-body');
    const countEl = document.getElementById('history-count');

    try {
        const res = await fetch('/api/uploads/history');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();

        countEl.textContent = `${data.uploads.length} uploads`;

        if (data.uploads.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5"
                style="text-align:center; padding:20px; color:#aaa;">
                No uploads yet
            </td></tr>`;
            return;
        }

        tbody.innerHTML = data.uploads.map(u => `
            <tr id="upload-row-${u.id}">
                <td>
                    <i class="fas fa-file-excel" style="color:#11998e; margin-right:6px;"></i>
                    ${u.filename}
                </td>
                <td>${u.rows_imported} records</td>
                <td>${u.uploaded_at}</td>
                <td>
                    <span style="padding:4px 10px; border-radius:20px; font-size:0.78rem;
                                 font-weight:600; background:#d4edda; color:#155724;">
                        ${u.status}
                    </span>
                </td>
                <td>
                    <button onclick="deleteUpload(${u.id}, '${u.filename}', ${u.rows_imported})"
                        style="padding:5px 12px; background:#fde8ec; color:#e94560;
                               border:1px solid #f5c6cb; border-radius:6px;
                               cursor:pointer; font-size:0.82rem; font-weight:600;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5"
            style="text-align:center; padding:20px; color:#e94560;">
            Failed to load history
        </td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    loadUploadHistory();

    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) confirmAndUpload(e.target.files[0]);
        // Reset so same file can be re-uploaded
        fileInput.value = '';
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) confirmAndUpload(file);
    });
});