// ========================================
// Diary Date Data
// ========================================
import { GIST_ID, GITHUB_TOKEN, GIST_FILENAME, SAMPLE_DATES } from './config.js';

let cachedDates = null;

export async function loadDates() {
    if (!GIST_ID) {
        console.log('No Gist ID configured, using sample dates');
        cachedDates = [...SAMPLE_DATES];
        return cachedDates;
    }

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {},
        });

        if (!response.ok) throw new Error(`Gist fetch failed: ${response.status}`);

        const gist = await response.json();
        const file = gist.files[GIST_FILENAME];

        if (!file) {
            console.log('Gist file not found, using sample dates');
            cachedDates = [...SAMPLE_DATES];
            return cachedDates;
        }

        const data = JSON.parse(file.content);
        // Support both flat array and { dates: [...] } format
        cachedDates = Array.isArray(data) ? data : (data.dates || []);
        return cachedDates;
    } catch (err) {
        console.error('Failed to load dates from Gist:', err);
        cachedDates = [...SAMPLE_DATES];
        return cachedDates;
    }
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
