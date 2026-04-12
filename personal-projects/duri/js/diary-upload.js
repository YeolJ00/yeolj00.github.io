// ========================================
// Diary Upload Orchestration
// Create / Edit / Delete entries + draft autosave
// ========================================
import { loadDates, saveDates, getDates, getDateById } from './diary-data.js';
import { makeFullSize, makeThumbnail, blobToDataUrl, dataUrlToBlob } from './image-processor.js';
import { uploadEntryAssets, editEntryAssets, deleteEntryAssets } from './github-uploader.js';

const DRAFT_KEY = 'diary_draft';
const DRAFT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB cap on what we persist as base64

// Guards saveDraft from racing a concurrent upload. saveDraft awaits
// makeFullSize, so a draft-save scheduled right before the user hits 올리기
// could finish AFTER createEntry's clearDraft() and repopulate localStorage.
let _uploadInProgress = false;

// ---------- ID generation ----------

function generateEntryId() {
    // Compact, sortable, collision-resistant enough for one user
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 6);
    return `d${t}${r}`;
}

// ---------- Create ----------

export async function createEntry({ date, description, files, thumbnailIndex = 0 }, onProgress = () => {}) {
    if (!date) throw new Error('Date is required');
    if (!files || files.length === 0) throw new Error('At least one image is required');

    _uploadInProgress = true;
    try {
        const entryId = generateEntryId();
        const safeThumbIdx = Math.max(0, Math.min(thumbnailIndex | 0, files.length - 1));

        onProgress({ phase: 'resize', current: 0, total: files.length });
        let resizedCount = 0;
        const fullItems = await Promise.all(files.map(async (f) => {
            const item = await makeFullSize(f);
            resizedCount++;
            onProgress({ phase: 'resize', current: resizedCount, total: files.length });
            return item;
        }));
        const thumbItem = await makeThumbnail(files[safeThumbIdx]);

        onProgress({ phase: 'commit-start' });
        const { imageUrls, thumbnailUrl } = await uploadEntryAssets({
            entryId,
            dateStr: date,
            fullItems,
            thumbItem,
            onProgress: (p) => onProgress(p),
        });

        onProgress({ phase: 'gist' });
        const all = await loadDates();
        const entry = {
            id: entryId,
            date,
            description: description || '',
            thumbnail: thumbnailUrl,
            images: imageUrls,
        };
        const next = [...all, entry];
        await saveDates(next);

        clearDraft();
        onProgress({ phase: 'done' });
        return entry;
    } finally {
        _uploadInProgress = false;
    }
}

// ---------- Edit ----------

// removedImageUrls: subset of the existing entry.images to delete
// addedFiles: new File objects to append
// thumbChoice:
//   null                                  → keep current thumbnail (auto-regen if first kept is gone)
//   { kind: 'new', index }                → generate thumb from addedFiles[index]
//   { kind: 'existing', url }             → point thumbnail at an existing kept image URL
export async function editEntry(entryId, { date, description, removedImageUrls = [], addedFiles = [], thumbChoice = null }, onProgress = () => {}) {
    _uploadInProgress = true;
    try {
        const all = getDates().length ? getDates() : await loadDates();
        const entry = all.find(e => e.id === entryId);
        if (!entry) throw new Error(`Entry not found: ${entryId}`);

        const newDate = date || entry.date;
        const oldImages = entry.images || [];
        const keptImages = oldImages.filter(u => !removedImageUrls.includes(u));

        // Resize new files in parallel
        onProgress({ phase: 'resize', current: 0, total: addedFiles.length });
        let editResizedCount = 0;
        const addItems = await Promise.all(addedFiles.map(async (f) => {
            const item = await makeFullSize(f);
            editResizedCount++;
            onProgress({ phase: 'resize', current: editResizedCount, total: addedFiles.length });
            return item;
        }));

        // Resolve the thumbnail directive from thumbChoice. If the user didn't touch the
        // star picker, fall back to the auto-regen heuristic: if the first kept image is
        // gone and they added new files, regenerate from the first added file.
        let newThumbItem = null;
        let thumbnailUrlOverride = null;
        if (thumbChoice?.kind === 'new' && addedFiles[thumbChoice.index]) {
            newThumbItem = await makeThumbnail(addedFiles[thumbChoice.index]);
        } else if (thumbChoice?.kind === 'existing') {
            thumbnailUrlOverride = thumbChoice.url;
        } else {
            const firstKeptIsGone = oldImages.length > 0 && removedImageUrls.includes(oldImages[0]);
            if (firstKeptIsGone && addedFiles.length > 0) {
                newThumbItem = await makeThumbnail(addedFiles[0]);
            }
        }

        // The "next index" for added images = highest existing index + 1
        let nextIndex = 0;
        for (const url of oldImages) {
            const m = url.match(/-(\d+)\.(?:jpg|jpeg|png|webp)$/i);
            if (m) nextIndex = Math.max(nextIndex, parseInt(m[1], 10) + 1);
        }

        onProgress({ phase: 'commit-start' });
        const { addedUrls, thumbnailUrl } = await editEntryAssets({
            entryId,
            dateStr: newDate,
            addItems,
            addStartIndex: nextIndex,
            removedUrls: removedImageUrls,
            newThumbItem,
            thumbnailUrlOverride,
            oldThumbUrl: entry.thumbnail,
            onProgress: (p) => onProgress(p),
        });

        onProgress({ phase: 'gist' });
        const updatedEntry = {
            ...entry,
            date: newDate,
            description: description !== undefined ? description : entry.description,
            images: [...keptImages, ...addedUrls],
            thumbnail: thumbnailUrl || entry.thumbnail,
        };
        const next = all.map(e => e.id === entryId ? updatedEntry : e);
        await saveDates(next);

        clearDraft();
        onProgress({ phase: 'done' });
        return updatedEntry;
    } finally {
        _uploadInProgress = false;
    }
}

// ---------- Delete ----------

export async function deleteEntry(entryId, onProgress = () => {}) {
    const all = getDates().length ? getDates() : await loadDates();
    const entry = all.find(e => e.id === entryId);
    if (!entry) throw new Error(`Entry not found: ${entryId}`);

    onProgress({ phase: 'commit-start' });
    await deleteEntryAssets({
        entryId,
        dateStr: entry.date,
        imageUrls: entry.images || [],
        thumbnailUrl: entry.thumbnail,
        onProgress: (p) => onProgress(p),
    });

    onProgress({ phase: 'gist' });
    const next = all.filter(e => e.id !== entryId);
    await saveDates(next);
    onProgress({ phase: 'done' });
}

// ---------- Draft autosave ----------
// Persist form state to localStorage so a refresh / accidental close doesn't lose work.
// Files are stored as data URLs with a total size cap.

export async function saveDraft({ date, description, files }) {
    // Early bail — no need to start resizing if an upload is already running.
    if (_uploadInProgress) return;
    try {
        const fileEntries = [];
        let bytes = 0;
        for (const f of files || []) {
            // Resize first to keep the draft small
            const { blob } = await makeFullSize(f);
            const dataUrl = await blobToDataUrl(blob);
            bytes += dataUrl.length;
            if (bytes > DRAFT_MAX_BYTES) break;
            fileEntries.push({ name: f.name, dataUrl });
        }
        // Re-check after the async resize loop — an upload may have started
        // while we were awaiting makeFullSize, and writing now would repopulate
        // the draft localStorage key just after clearDraft() ran.
        if (_uploadInProgress) return;
        const draft = { date, description, files: fileEntries, savedAt: Date.now() };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (err) {
        console.warn('Failed to save draft:', err);
    }
}

export function hasDraft() {
    return !!localStorage.getItem(DRAFT_KEY);
}

export async function loadDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
        const draft = JSON.parse(raw);
        const files = [];
        for (const f of draft.files || []) {
            const blob = await dataUrlToBlob(f.dataUrl);
            files.push(new File([blob], f.name, { type: blob.type || 'image/jpeg' }));
        }
        return { date: draft.date, description: draft.description, files, savedAt: draft.savedAt };
    } catch (err) {
        console.warn('Failed to load draft:', err);
        return null;
    }
}

export function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
}

export function getEntryForEdit(entryId) {
    return getDateById(entryId);
}
