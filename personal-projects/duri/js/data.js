// ========================================
// Gist Data Storage
// ========================================
import { GIST_ID, TRIPS_GIST_FILE, SAMPLE_TRIPS, SAMPLE_KR_TRIPS } from './config.js';
import { getToken } from './auth.js';

let cachedTrips = null;
let cachedKrTrips = null;

export async function loadTrips() {
    if (!GIST_ID) {
        console.log('No Gist ID configured, using sample data');
        cachedTrips = [...SAMPLE_TRIPS];
        cachedKrTrips = [...SAMPLE_KR_TRIPS];
        return cachedTrips;
    }

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: getToken() ? { 'Authorization': `token ${getToken()}` } : {},
        });

        if (!response.ok) throw new Error(`Gist fetch failed: ${response.status}`);

        const gist = await response.json();
        const file = gist.files[TRIPS_GIST_FILE];

        if (!file) {
            console.log('Gist file not found, using sample data');
            cachedTrips = [...SAMPLE_TRIPS];
            return cachedTrips;
        }

        cachedTrips = JSON.parse(file.content);
        return cachedTrips;
    } catch (err) {
        console.error('Failed to load trips from Gist:', err);
        cachedTrips = [...SAMPLE_TRIPS];
        return cachedTrips;
    }
}

export async function saveTrips(trips) {
    const token = getToken();
    if (!GIST_ID || !token) {
        console.warn('Gist not configured, cannot save');
        cachedTrips = trips;
        return false;
    }

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    [TRIPS_GIST_FILE]: {
                        content: JSON.stringify(trips, null, 2),
                    },
                },
            }),
        });

        if (!response.ok) throw new Error(`Gist save failed: ${response.status}`);

        cachedTrips = trips;
        return true;
    } catch (err) {
        console.error('Failed to save trips to Gist:', err);
        return false;
    }
}

export function getTrips() {
    return cachedTrips || [];
}

export function getKrTrips() {
    return cachedKrTrips || [];
}

export function getTripById(id) {
    return (cachedTrips || []).find(t => t.id === id)
        || (cachedKrTrips || []).find(t => t.id === id);
}

// Get unique countries from trips
export function getCountries() {
    const trips = getTrips();
    const countries = new Set(trips.map(t => t.country).filter(Boolean));
    return [...countries];
}

// Get date range from trips
export function getDateRange() {
    const trips = getTrips();
    if (!trips.length) return { min: null, max: null };

    const dates = trips.map(t => new Date(t.startDate)).filter(d => !isNaN(d));
    if (!dates.length) return { min: null, max: null };

    return {
        min: new Date(Math.min(...dates)),
        max: new Date(Math.max(...dates)),
    };
}

// Filter trips
export function filterTrips({ countries = [], yearRange = null, searchTerm = '' } = {}) {
    let trips = getTrips();

    if (countries.length > 0) {
        trips = trips.filter(t => countries.includes(t.country));
    }

    if (yearRange) {
        trips = trips.filter(t => {
            const year = new Date(t.startDate).getFullYear();
            return year >= yearRange[0] && year <= yearRange[1];
        });
    }

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        trips = trips.filter(t =>
            t.title.toLowerCase().includes(term) ||
            t.location.toLowerCase().includes(term) ||
            (t.comment && t.comment.toLowerCase().includes(term))
        );
    }

    return trips;
}
