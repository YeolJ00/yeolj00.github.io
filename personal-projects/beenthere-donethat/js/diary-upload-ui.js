// ========================================
// Diary Upload UI: FAB, password gate, form, edit/delete
// ========================================
import { isAuthed, checkPassword } from './auth.js';
import {
    createEntry, editEntry, deleteEntry,
    saveDraft, loadDraft, hasDraft, clearDraft,
} from './diary-upload.js';

const anime = window.anime;

let overlayEl, panelEl;
let mode = null;          // 'password' | 'create' | 'edit'
let editingEntry = null;
let formState = null;     // { date, description, files, removedUrls }
let draftSaveTimer = null;
let busy = false;
let onSavedCallback = null;
let datePickerInstance = null;  // flatpickr instance, destroyed on close

// ========== Init ==========

export function initUploadUI(onSaved) {
    onSavedCallback = onSaved;

    overlayEl = document.createElement('div');
    overlayEl.className = 'upload-overlay';
    document.body.appendChild(overlayEl);

    panelEl = document.createElement('div');
    panelEl.className = 'upload-panel';
    document.body.appendChild(panelEl);

    overlayEl.addEventListener('click', (e) => {
        if (e.target === overlayEl && !busy) closeUpload();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlayEl.classList.contains('visible') && !busy) {
            closeUpload();
        }
    });

    window.__uploadCloseHandler = () => { if (!busy) closeUpload(); };
}

// ========== Open / Close ==========

export async function openCreate() {
    if (!isAuthed()) {
        await openPasswordPrompt(() => openCreate());
        return;
    }
    mode = 'create';
    editingEntry = null;
    // thumbChoice is null until the first file is added; addFiles() seeds it.
    formState = { date: todayStr(), description: '', files: [], removedUrls: [], thumbChoice: null };

    if (hasDraft()) {
        const useDraft = await confirmDraftRestore();
        if (useDraft) {
            const draft = await loadDraft();
            if (draft) {
                formState.date = draft.date || formState.date;
                formState.description = draft.description || '';
                formState.files = draft.files || [];
            }
        } else {
            clearDraft();
        }
    }
    renderForm();
    showPanel();
}

export async function openEdit(entry) {
    if (!isAuthed()) {
        await openPasswordPrompt(() => openEdit(entry));
        return;
    }
    mode = 'edit';
    editingEntry = entry;
    // thumbChoice null = keep current thumbnail. User clicking a star sets it.
    formState = {
        date: entry.date,
        description: entry.description || '',
        files: [],
        removedUrls: [],
        thumbChoice: null,
    };
    renderForm();
    showPanel();
}

function showPanel() {
    overlayEl.classList.add('visible');
    // Force reflow so the class toggle fires a CSS transition rather than
    // a style skip on the first insertion.
    void panelEl.offsetWidth;
    panelEl.classList.add('visible');
    if (anime) {
        anime({ targets: overlayEl, opacity: [0, 1], duration: 280, easing: 'easeOutQuad' });
    }
}

function closeUpload() {
    // Destroy flatpickr before the DOM it was bound to gets wiped — otherwise
    // its detached calendar container can linger in <body>.
    if (datePickerInstance) {
        try { datePickerInstance.destroy(); } catch {}
        datePickerInstance = null;
    }
    if (anime) {
        anime({ targets: overlayEl, opacity: [1, 0], duration: 220, easing: 'easeInQuad',
            complete: () => overlayEl.classList.remove('visible') });
    } else {
        overlayEl.classList.remove('visible');
    }
    panelEl.classList.remove('visible');
    setTimeout(() => { panelEl.innerHTML = ''; }, 350);
    mode = null;
    editingEntry = null;
    formState = null;
}

// ========== Password gate ==========

function openPasswordPrompt(onSuccess) {
    return new Promise((resolve) => {
        mode = 'password';
        panelEl.innerHTML = `
            <div class="upload-panel-inner upload-password">
                <h2>비밀번호</h2>
                <p class="upload-hint">머문자리에 기록을 남기려면 비밀번호를 입력해주세요.</p>
                <input type="password" id="upload-pw-input" autocomplete="current-password" placeholder="비밀번호" />
                <div class="upload-pw-error" id="upload-pw-error"></div>
                <div class="upload-actions">
                    <button class="upload-btn-secondary" id="upload-pw-cancel">취소</button>
                    <button class="upload-btn-primary" id="upload-pw-submit">확인</button>
                </div>
            </div>
        `;
        showPanel();
        const input = panelEl.querySelector('#upload-pw-input');
        const errEl = panelEl.querySelector('#upload-pw-error');
        const submit = async () => {
            const ok = await checkPassword(input.value);
            if (ok) {
                // Don't call closeUpload() here — its fade-out animation's
                // complete handler would wipe panelEl.innerHTML ~220ms later,
                // erasing the form that onSuccess is about to render.
                resolve(true);
                if (onSuccess) onSuccess();
            } else {
                errEl.textContent = '비밀번호가 맞지 않아요.';
                input.value = '';
                input.focus();
            }
        };
        panelEl.querySelector('#upload-pw-submit').addEventListener('click', submit);
        panelEl.querySelector('#upload-pw-cancel').addEventListener('click', () => {
            closeUpload();
            resolve(false);
        });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        setTimeout(() => input.focus(), 50);
    });
}

// ========== Form ==========

function renderForm() {
    const isEdit = mode === 'edit';
    const keptImageUrls = isEdit
        ? (editingEntry.images || []).filter(u => !formState.removedUrls.includes(u))
        : [];

    panelEl.innerHTML = `
        <div class="upload-panel-inner">
            <div class="upload-header">
                <h2>${isEdit ? '기록 수정' : '새 기록'}</h2>
                <button class="upload-close" aria-label="닫기">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>

            <label class="upload-field">
                <span class="upload-label">날짜</span>
                <input type="date" id="upload-date" value="${formState.date}" />
            </label>

            <label class="upload-field">
                <span class="upload-label">기록</span>
                <textarea id="upload-desc" rows="4" placeholder="오늘 어떤 하루였나요?">${escapeHtml(formState.description)}</textarea>
            </label>

            <div class="upload-field">
                <span class="upload-label">사진</span>
                <div class="upload-cover-hint">⭐ 표시된 사진이 대표사진이에요. 다른 사진을 눌러 바꿀 수 있어요.</div>
                ${isEdit && keptImageUrls.length > 0 ? `
                    <div class="upload-image-grid" id="upload-existing-grid"></div>
                ` : ''}
                <div class="upload-dropzone" id="upload-dropzone">
                    <div class="upload-dropzone-text">
                        <strong>사진을 끌어다 놓거나 클릭</strong>
                        <span>여러 장 선택 가능</span>
                    </div>
                    <input type="file" id="upload-files" accept="image/*" multiple hidden />
                </div>
                <div class="upload-image-grid" id="upload-new-grid"></div>
            </div>

            <div class="upload-progress" id="upload-progress" style="display:none;">
                <div class="upload-progress-text">준비 중...</div>
                <div class="upload-progress-bar"><div class="upload-progress-fill"></div></div>
            </div>

            <div class="upload-actions">
                ${isEdit ? '<button class="upload-btn-danger" id="upload-delete">삭제</button>' : ''}
                <span class="upload-actions-spacer"></span>
                <button class="upload-btn-secondary" id="upload-cancel">취소</button>
                <button class="upload-btn-primary" id="upload-save">${isEdit ? '저장' : '올리기'}</button>
            </div>
        </div>
    `;

    bindFormEvents();
    refreshImageGrids();
}

function bindFormEvents() {
    panelEl.querySelector('.upload-close').addEventListener('click', () => { if (!busy) closeUpload(); });
    panelEl.querySelector('#upload-cancel').addEventListener('click', () => { if (!busy) closeUpload(); });

    const dateInput = panelEl.querySelector('#upload-date');
    // Replace the default browser calendar popover with flatpickr so we can
    // actually style it. Fallback: if flatpickr failed to load, the input
    // falls back to the native date picker (still usable, just uglier).
    if (window.flatpickr) {
        datePickerInstance = window.flatpickr(dateInput, {
            locale: window.flatpickr.l10ns?.ko || 'default',
            dateFormat: 'Y-m-d',
            defaultDate: formState.date,
            disableMobile: true,  // force flatpickr UI on mobile too
            allowInput: false,
            onChange: (_dates, dateStr) => {
                formState.date = dateStr;
                scheduleDraftSave();
            },
        });
    } else {
        dateInput.addEventListener('change', () => { formState.date = dateInput.value; scheduleDraftSave(); });
    }

    const descInput = panelEl.querySelector('#upload-desc');
    descInput.addEventListener('input', () => { formState.description = descInput.value; scheduleDraftSave(); });

    const fileInput = panelEl.querySelector('#upload-files');
    const dropzone = panelEl.querySelector('#upload-dropzone');
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => addFiles(Array.from(e.target.files || [])));

    ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
    }));
    dropzone.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
        addFiles(files);
    });

    panelEl.querySelector('#upload-save').addEventListener('click', handleSave);

    const deleteBtn = panelEl.querySelector('#upload-delete');
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
}

function addFiles(files) {
    if (!files.length) return;
    formState.files = [...formState.files, ...files];
    // Create mode: seed thumbChoice to the first file on first add
    if (mode === 'create' && !formState.thumbChoice) {
        formState.thumbChoice = { kind: 'new', index: 0 };
    }
    refreshImageGrids();
    scheduleDraftSave();
}

// Unified image grid rendering: existing (edit-only) + newly added, with star selector
function refreshImageGrids() {
    // Track blob-URL objects so we can revoke them on the next render
    _fileObjectUrls.forEach(u => URL.revokeObjectURL(u));
    _fileObjectUrls = [];

    normalizeThumbChoice();

    const existingGrid = panelEl.querySelector('#upload-existing-grid');
    if (existingGrid) {
        existingGrid.innerHTML = '';
        const keptImageUrls = (editingEntry.images || []).filter(u => !formState.removedUrls.includes(u));
        keptImageUrls.forEach((url) => {
            const tile = buildTile({
                src: url,
                isCover: formState.thumbChoice?.kind === 'existing' && formState.thumbChoice.url === url,
                onRemove: () => {
                    formState.removedUrls.push(url);
                    if (formState.thumbChoice?.kind === 'existing' && formState.thumbChoice.url === url) {
                        formState.thumbChoice = null;
                    }
                    refreshImageGrids();
                },
                onPickCover: () => {
                    formState.thumbChoice = { kind: 'existing', url };
                    refreshImageGrids();
                },
            });
            existingGrid.appendChild(tile);
        });
    }

    const newGrid = panelEl.querySelector('#upload-new-grid');
    if (newGrid) {
        newGrid.innerHTML = '';
        formState.files.forEach((file, idx) => {
            const objUrl = URL.createObjectURL(file);
            _fileObjectUrls.push(objUrl);
            const tile = buildTile({
                src: objUrl,
                isCover: formState.thumbChoice?.kind === 'new' && formState.thumbChoice.index === idx,
                onRemove: () => {
                    formState.files.splice(idx, 1);
                    if (formState.thumbChoice?.kind === 'new') {
                        if (formState.thumbChoice.index === idx) {
                            formState.thumbChoice = null;
                        } else if (formState.thumbChoice.index > idx) {
                            formState.thumbChoice = { kind: 'new', index: formState.thumbChoice.index - 1 };
                        }
                    }
                    refreshImageGrids();
                    scheduleDraftSave();
                },
                onPickCover: () => {
                    formState.thumbChoice = { kind: 'new', index: idx };
                    refreshImageGrids();
                },
            });
            newGrid.appendChild(tile);
        });
    }
}

let _fileObjectUrls = [];

function buildTile({ src, isCover, onRemove, onPickCover }) {
    const div = document.createElement('div');
    div.className = 'upload-image-thumb' + (isCover ? ' is-cover' : '');
    div.innerHTML = `
        <img src="${escapeHtml(src)}" alt="" />
        <button type="button" class="upload-image-cover-btn" aria-label="대표사진으로 지정">
            <svg viewBox="0 0 24 24" fill="${isCover ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
        </button>
        <button type="button" class="upload-image-remove" aria-label="삭제">×</button>
    `;
    div.querySelector('.upload-image-cover-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        onPickCover();
    });
    div.querySelector('.upload-image-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove();
    });
    return div;
}

// Keep thumbChoice pointing at something valid. Called before every render.
function normalizeThumbChoice() {
    const choice = formState.thumbChoice;
    if (!choice) {
        // Create mode: default to first file if any exist
        if (mode === 'create' && formState.files.length > 0) {
            formState.thumbChoice = { kind: 'new', index: 0 };
        }
        return;
    }
    if (choice.kind === 'new') {
        if (!formState.files[choice.index]) {
            formState.thumbChoice = formState.files.length > 0 ? { kind: 'new', index: 0 } : null;
        }
    } else if (choice.kind === 'existing') {
        const kept = (editingEntry?.images || []).filter(u => !formState.removedUrls.includes(u));
        if (!kept.includes(choice.url)) {
            formState.thumbChoice = null;
        }
    }
}

// ========== Draft autosave ==========

function scheduleDraftSave() {
    if (mode !== 'create') return;
    clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => {
        saveDraft({
            date: formState.date,
            description: formState.description,
            files: formState.files,
        });
    }, 800);
}

function confirmDraftRestore() {
    return new Promise((resolve) => {
        // Simple inline confirm — could be a nicer toast later
        const ok = window.confirm('저장된 임시 기록이 있어요. 이어서 작성할까요?');
        resolve(ok);
    });
}

// ========== Save / Delete ==========

async function handleSave() {
    if (busy) return;
    const date = panelEl.querySelector('#upload-date').value || formState.date;
    const description = panelEl.querySelector('#upload-desc').value;

    if (!date) { alert('날짜를 선택해주세요.'); return; }

    if (mode === 'create') {
        if (!formState.files.length) { alert('사진을 한 장 이상 추가해주세요.'); return; }
    }

    // Cancel any pending draft autosave — the _uploadInProgress guard in
    // diary-upload.js is the real defense, but clearing the timer here avoids
    // waking the autosave coroutine at all.
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;

    busy = true;
    setBusyUI(true);
    try {
        if (mode === 'create') {
            const thumbIdx = formState.thumbChoice?.kind === 'new' ? formState.thumbChoice.index : 0;
            await createEntry(
                { date, description, files: formState.files, thumbnailIndex: thumbIdx },
                reportProgress
            );
        } else {
            await editEntry(
                editingEntry.id,
                {
                    date,
                    description,
                    removedImageUrls: formState.removedUrls,
                    addedFiles: formState.files,
                    thumbChoice: formState.thumbChoice,
                },
                reportProgress
            );
        }
        if (onSavedCallback) await onSavedCallback();
        closeUpload();
    } catch (err) {
        console.error(err);
        alert('업로드 실패: ' + (err.message || err));
    } finally {
        busy = false;
        setBusyUI(false);
    }
}

async function handleDelete() {
    if (busy || !editingEntry) return;
    if (!window.confirm('이 기록을 삭제할까요? 사진도 함께 삭제됩니다.')) return;
    busy = true;
    setBusyUI(true);
    try {
        await deleteEntry(editingEntry.id, reportProgress);
        if (onSavedCallback) await onSavedCallback();
        closeUpload();
    } catch (err) {
        console.error(err);
        alert('삭제 실패: ' + (err.message || err));
    } finally {
        busy = false;
        setBusyUI(false);
    }
}

function setBusyUI(b) {
    const progress = panelEl.querySelector('#upload-progress');
    // Inline style beats any stylesheet rule in specificity — avoids the
    // [hidden]-attribute-vs-display-flex cascade fight we hit earlier.
    if (progress) progress.style.display = b ? 'flex' : 'none';
    panelEl.querySelectorAll('button, input, textarea').forEach(el => {
        if (el.classList.contains('upload-close')) return;
        el.disabled = b;
    });
}

function reportProgress(p) {
    const text = panelEl.querySelector('.upload-progress-text');
    const fill = panelEl.querySelector('.upload-progress-fill');
    if (!text || !fill) return;
    let label = '';
    let pct = 0;
    switch (p.phase) {
        case 'resize':
            label = `사진 처리 중 ${p.current}/${p.total}`;
            pct = (p.current / Math.max(p.total, 1)) * 30;
            break;
        case 'commit-start':
            label = '업로드 시작...';
            pct = 32;
            break;
        case 'asset-upload':
            label = `사진 업로드 ${p.current}/${p.total}`;
            pct = 42 + (p.current / Math.max(p.total, 1)) * 50;
            break;
        case 'commit-build':
            label = '커밋 만드는 중...';
            pct = 92;
            break;
        case 'gist':
            label = '기록 갱신 중...';
            pct = 96;
            break;
        case 'done':
            label = '완료!';
            pct = 100;
            break;
    }
    if (label) text.textContent = label;
    fill.style.width = `${pct}%`;
}

// ========== Helpers ==========

function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
