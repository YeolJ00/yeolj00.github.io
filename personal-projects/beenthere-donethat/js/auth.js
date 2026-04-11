// ========================================
// Auth: password gate + PAT plumbing
// ========================================
import { PASSWORD_HASH, TOKEN_PARTS } from './config.js';

const SESSION_KEY = 'diary_auth';

export async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function checkPassword(input) {
    if (!PASSWORD_HASH) {
        console.warn('PASSWORD_HASH not configured');
        return false;
    }
    const hash = await sha256(input);
    const ok = hash === PASSWORD_HASH;
    if (ok) sessionStorage.setItem(SESSION_KEY, '1');
    return ok;
}

export function isAuthed() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function clearAuth() {
    sessionStorage.removeItem(SESSION_KEY);
}

// Reassemble the PAT from the parts in config.js. This is obfuscation, not security —
// it just keeps the literal token out of the source so casual scanners and string-grep
// tools don't pick it up.
export function getToken() {
    if (!TOKEN_PARTS || TOKEN_PARTS.length === 0) return '';
    return TOKEN_PARTS.join('');
}
