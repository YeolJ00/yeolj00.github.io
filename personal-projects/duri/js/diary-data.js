// ========================================
// Diary Date Data
// ========================================
import { GIST_ID, DIARY_GIST_FILE, SAMPLE_DATES } from './config.js';
import { getToken } from './auth.js';

let cachedDates = null;

export async function loadDates() {
    if (!GIST_ID) {
        console.log('No Gist ID configured, using sample dates');
        cachedDates = [...SAMPLE_DATES];
        return cachedDates;
    }

    try {
        const token = getToken();
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: token ? { 'Authorization': `token ${token}` } : {},
        });

        if (!response.ok) throw new Error(`Gist fetch failed: ${response.status}`);

        const gist = await response.json();
        const file = gist.files[DIARY_GIST_FILE];

        if (!file) {
            console.log(`Gist file ${DIARY_GIST_FILE} not found, using sample dates`);
            cachedDates = [...SAMPLE_DATES];
            return cachedDates;
        }

        const data = JSON.parse(file.content);
        cachedDates = Array.isArray(data) ? data : (data.dates || []);
        return cachedDates;
    } catch (err) {
        console.error('Failed to load dates from Gist:', err);
        cachedDates = [...SAMPLE_DATES];
        return cachedDates;
    }
}

export async function saveDates(dates) {
    const token = getToken();
    if (!GIST_ID) throw new Error('GIST_ID not configured in js/config.js');
    if (!token) throw new Error('TOKEN_PARTS not configured in js/config.js');

    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            files: {
                [DIARY_GIST_FILE]: {
                    content: JSON.stringify(dates, null, 2),
                },
            },
        }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Gist save failed: ${response.status} ${body}`);
    }

    cachedDates = dates;
    return true;
}

export function getDates() {
    return cachedDates || [];
}

export function getDatesByMonth(yearMonth) {
    return getDates().filter(d => d.date.startsWith(yearMonth));
}

export function getMonthList() {
    const months = new Set(getDates().map(d => d.date.substring(0, 7)));
    return [...months].sort();
}

export function getDateById(id) {
    return getDates().find(d => d.id === id);
}
