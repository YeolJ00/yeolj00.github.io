// ========================================
// GitHub Uploader: atomic commits via Git Data API
// ========================================
// Images are committed to the repo at `UPLOAD_PATH_PREFIX/YYYY/MM/...` and served
// via raw.githubusercontent.com so they're visible immediately (no GitHub Pages
// redeploy wait). The Git Data API (api.github.com) is used so CORS is allowed —
// uploads.github.com (the Releases asset endpoint) doesn't send CORS headers
// and is unusable from a browser.
import { REPO_OWNER, REPO_NAME, GIT_BRANCH, UPLOAD_PATH_PREFIX } from './config.js';
import { getToken } from './auth.js';

const API = 'https://api.github.com';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${GIT_BRANCH}/`;

function authHeaders() {
    const token = getToken();
    if (!token) throw new Error('GitHub token not configured');
    return {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };
}

async function gh(path, init = {}) {
    const res = await fetch(`${API}${path}`, {
        ...init,
        headers: { ...authHeaders(), ...(init.headers || {}) },
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`GitHub ${init.method || 'GET'} ${path} → ${res.status}: ${body}`);
    }
    return res.json();
}

function repoBase() {
    return `/repos/${REPO_OWNER}/${REPO_NAME}`;
}

function imagePathFor(entryId, dateStr, index, ext) {
    const [year, month] = dateStr.split('-');
    return `${UPLOAD_PATH_PREFIX}/${year}/${month}/${entryId}-${index}.${ext}`;
}

function thumbPathFor(entryId, dateStr, ext) {
    const [year, month] = dateStr.split('-');
    return `${UPLOAD_PATH_PREFIX}/${year}/${month}/${entryId}-thumb.${ext}`;
}

function urlForPath(path) {
    return RAW_BASE + path;
}

function pathForUrl(url) {
    if (!url || !url.startsWith(RAW_BASE)) return null;
    return url.slice(RAW_BASE.length);
}

async function blobToBase64(blob) {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // btoa operates on binary strings; chunked to avoid call-stack blowouts on big blobs
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

async function createBlob(blob) {
    const base64 = await blobToBase64(blob);
    const result = await gh(`${repoBase()}/git/blobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: base64, encoding: 'base64' }),
    });
    return result.sha;
}

async function getCurrentRef() {
    const ref = await gh(`${repoBase()}/git/ref/heads/${GIT_BRANCH}`);
    return ref.object.sha;
}

async function getCommitTreeSha(commitSha) {
    const commit = await gh(`${repoBase()}/git/commits/${commitSha}`);
    return commit.tree.sha;
}

// Returns a Set of all blob paths present in the given tree (recursive).
async function listTreePaths(treeSha) {
    const tree = await gh(`${repoBase()}/git/trees/${treeSha}?recursive=1`);
    const paths = new Set();
    for (const item of tree.tree || []) {
        if (item.type === 'blob') paths.add(item.path);
    }
    return paths;
}

// addEntries: [{ path, blob }]
// deletePaths: [string]
async function buildAtomicCommit({ addEntries = [], deletePaths = [], message, onProgress }) {
    if (addEntries.length === 0 && deletePaths.length === 0) return null;

    const parentSha = await getCurrentRef();
    const baseTreeSha = await getCommitTreeSha(parentSha);

    // Filter deletePaths against the actual base_tree contents. The GitHub
    // Trees API rejects the whole commit (422 BadObjectState) if any path
    // marked for deletion doesn't exist in base_tree — even if other paths
    // are valid. This guards against gist/repo drift from prior partial
    // failures: any missing target is silently skipped instead of poisoning
    // the commit.
    if (deletePaths.length > 0) {
        const existing = await listTreePaths(baseTreeSha);
        const filtered = deletePaths.filter(p => existing.has(p));
        const skipped = deletePaths.filter(p => !existing.has(p));
        if (skipped.length > 0) {
            console.warn(`Skipping ${skipped.length} delete path(s) not present in tree:`, skipped);
        }
        deletePaths = filtered;
        if (addEntries.length === 0 && deletePaths.length === 0) return null;
    }

    // Upload blobs in parallel — they're independent API calls that each
    // return a SHA. Parallelising this is the single biggest speed win
    // because blob uploads are the heaviest network step.
    const CONCURRENCY = 4;
    let uploadedCount = 0;
    const treeEntries = [];

    // Process in batches of CONCURRENCY to avoid hammering the API
    for (let start = 0; start < addEntries.length; start += CONCURRENCY) {
        const batch = addEntries.slice(start, start + CONCURRENCY);
        const results = await Promise.all(batch.map(async (entry) => {
            const sha = await createBlob(entry.blob);
            uploadedCount++;
            if (onProgress) onProgress({ phase: 'asset-upload', current: uploadedCount, total: addEntries.length });
            return { path: entry.path, mode: '100644', type: 'blob', sha };
        }));
        treeEntries.push(...results);
    }
    for (const path of deletePaths) {
        treeEntries.push({ path, mode: '100644', type: 'blob', sha: null });
    }

    if (onProgress) onProgress({ phase: 'commit-build' });
    const tree = await gh(`${repoBase()}/git/trees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
    });

    const commit = await gh(`${repoBase()}/git/commits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
    });

    await gh(`${repoBase()}/git/refs/heads/${GIT_BRANCH}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: commit.sha }),
    });

    return commit.sha;
}

// Public API --------------------------------------------------------------

export async function uploadEntryAssets({ entryId, dateStr, fullItems, thumbItem, onProgress }) {
    const addEntries = fullItems.map((item, idx) => ({
        path: imagePathFor(entryId, dateStr, idx, item.ext),
        blob: item.blob,
    }));
    if (thumbItem) {
        addEntries.push({
            path: thumbPathFor(entryId, dateStr, thumbItem.ext),
            blob: thumbItem.blob,
        });
    }
    await buildAtomicCommit({
        addEntries,
        message: `diary: add ${entryId} (${dateStr})`,
        onProgress,
    });
    return {
        imageUrls: fullItems.map((item, idx) => urlForPath(imagePathFor(entryId, dateStr, idx, item.ext))),
        thumbnailUrl: thumbItem ? urlForPath(thumbPathFor(entryId, dateStr, thumbItem.ext)) : null,
    };
}

export async function editEntryAssets({
    entryId, dateStr,
    addItems, addStartIndex, removedUrls,
    newThumbItem, thumbnailUrlOverride, oldThumbUrl,
    onProgress,
}) {
    // Resolve the final thumbnail URL so we can detect when the old thumb is orphaned.
    let finalThumbnailUrl = null;
    if (newThumbItem) {
        finalThumbnailUrl = urlForPath(thumbPathFor(entryId, dateStr, newThumbItem.ext));
    } else if (thumbnailUrlOverride) {
        finalThumbnailUrl = thumbnailUrlOverride;
    }

    const addEntries = (addItems || []).map((item, i) => ({
        path: imagePathFor(entryId, dateStr, addStartIndex + i, item.ext),
        blob: item.blob,
    }));
    if (newThumbItem) {
        addEntries.push({
            path: thumbPathFor(entryId, dateStr, newThumbItem.ext),
            blob: newThumbItem.blob,
        });
    }

    const deletePaths = [];
    for (const url of (removedUrls || [])) {
        const p = pathForUrl(url);
        if (p) deletePaths.push(p);
    }
    if (oldThumbUrl && finalThumbnailUrl && oldThumbUrl !== finalThumbnailUrl) {
        const p = pathForUrl(oldThumbUrl);
        if (p && !deletePaths.includes(p)) deletePaths.push(p);
    }

    if (addEntries.length === 0 && deletePaths.length === 0) {
        return { addedUrls: [], thumbnailUrl: finalThumbnailUrl };
    }

    await buildAtomicCommit({
        addEntries,
        deletePaths,
        message: `diary: edit ${entryId} (${dateStr})`,
        onProgress,
    });

    return {
        addedUrls: (addItems || []).map((item, i) => urlForPath(imagePathFor(entryId, dateStr, addStartIndex + i, item.ext))),
        thumbnailUrl: finalThumbnailUrl,
    };
}

export async function deleteEntryAssets({ entryId, dateStr, imageUrls, thumbnailUrl, onProgress }) {
    const deletePaths = [];
    for (const url of (imageUrls || [])) {
        const p = pathForUrl(url);
        if (p) deletePaths.push(p);
    }
    if (thumbnailUrl) {
        const p = pathForUrl(thumbnailUrl);
        if (p && !deletePaths.includes(p)) deletePaths.push(p);
    }
    if (deletePaths.length === 0) return;

    await buildAtomicCommit({
        deletePaths,
        message: `diary: delete ${entryId} (${dateStr})`,
        onProgress,
    });
}
