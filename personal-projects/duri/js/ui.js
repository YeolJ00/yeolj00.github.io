// ========================================
// UI Components - Panel, Filters, Timeline, Lightbox
// ========================================
import {
    animateFilterOpen, animateFilterClose,
    animateLightboxOpen, animateLightboxClose,
    animateToastIn, animateToastOut,
    staggerFadeIn,
} from './animations.js';

const anime = window.anime;

// ===== Trip Detail Popup (center modal) =====
let tripPanelEl = null;
let panelOverlayEl = null;
let isPanelOpen = false;
let onPanelClose = null;
let currentTrips = []; // trips at the current location
let currentTripIndex = 0;

export function initTripPanel(onClose) {
    onPanelClose = onClose;

    panelOverlayEl = document.createElement('div');
    panelOverlayEl.className = 'panel-overlay';
    document.body.appendChild(panelOverlayEl);

    tripPanelEl = document.createElement('div');
    tripPanelEl.className = 'trip-panel';
    document.body.appendChild(tripPanelEl);

    panelOverlayEl.addEventListener('click', (e) => {
        if (e.target === panelOverlayEl) closeTripPanel();
    });
}

// Open popup with one or more trips (for multi-trip locations)
export async function openTripPanel(trips) {
    // Accept single trip or array
    if (!Array.isArray(trips)) trips = [trips];
    if (isPanelOpen) await closeTripPanel();

    currentTrips = trips;
    currentTripIndex = 0;
    isPanelOpen = true;

    renderTripContent(currentTrips[0], currentTrips, 0);

    window.__closeTripPanel = closeTripPanel;
    window.__selectTrip = (index) => {
        currentTripIndex = index;
        renderTripContent(currentTrips[index], currentTrips, index);
        // Animate the body content swap
        const bodyItems = tripPanelEl.querySelectorAll('.trip-panel-dates, .trip-panel-section-title, .trip-panel-comment, .trip-panel-images');
        staggerFadeIn(bodyItems, 60);
    };

    // Animate in: overlay fades, popup scales up
    tripPanelEl.style.pointerEvents = 'auto';
    panelOverlayEl.classList.add('visible');
    anime({ targets: panelOverlayEl, opacity: [0, 1], duration: 400, easing: 'easeOutQuad' });
    await anime({
        targets: tripPanelEl,
        opacity: [0, 1],
        scale: [0.92, 1],
        duration: 500,
        easing: 'easeOutCubic',
    }).finished;

    const bodyItems = tripPanelEl.querySelectorAll('.trip-panel-dates, .trip-panel-section-title, .trip-panel-comment, .trip-panel-images');
    staggerFadeIn(bodyItems, 80);
}

function renderTripContent(trip, allTrips, activeIndex) {
    const images = trip.images || [];
    const imagesHtml = images.map(src =>
        `<img src="${escapeHtml(src)}" alt="${escapeHtml(trip.title)}" loading="lazy" onclick="window.__openLightbox('${escapeHtml(src)}')">`
    ).join('');

    // Trip selector tabs (shown only if multiple trips)
    const tabsHtml = allTrips.length > 1 ? `
        <div class="trip-tabs">
            ${allTrips.map((t, i) => `
                <button class="trip-tab ${i === activeIndex ? 'active' : ''}"
                        onclick="window.__selectTrip(${i})">
                    ${escapeHtml(t.title)} · ${formatShortDate(t.startDate)}
                </button>
            `).join('')}
        </div>
    ` : '';

    tripPanelEl.innerHTML = `
        <div class="trip-panel-header">
            <img src="${escapeHtml(images[0] || trip.thumbnail || '')}" alt="${escapeHtml(trip.title)}">
            <div class="trip-panel-header-overlay">
                <div class="trip-panel-title">${escapeHtml(trip.title)}</div>
                <div class="trip-panel-location">${escapeHtml(trip.location)}</div>
            </div>
            <button class="trip-panel-close" onclick="window.__closeTripPanel()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
        ${tabsHtml}
        <div class="trip-panel-body">
            <div class="trip-panel-dates">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>${formatDateRange(trip.startDate, trip.endDate)}</span>
            </div>

            ${trip.comment ? `
                <div class="trip-panel-section-title">기록</div>
                <div class="trip-panel-comment">${escapeHtml(trip.comment)}</div>
            ` : ''}

            ${images.length > 0 ? `
                <div class="trip-panel-section-title">사진</div>
                <div class="trip-panel-images">${imagesHtml}</div>
            ` : ''}
        </div>
    `;

    // Update the popup scale transform to its final state
    tripPanelEl.style.transform = 'translate(-50%, -50%) scale(1)';
}

export async function closeTripPanel() {
    if (!isPanelOpen) return;
    isPanelOpen = false;

    // Immediately block interaction on panel so hidden images can't trigger lightbox
    tripPanelEl.style.pointerEvents = 'none';

    anime({ targets: panelOverlayEl, opacity: [1, 0], duration: 300, easing: 'easeInQuad',
        complete: () => panelOverlayEl.classList.remove('visible') });

    await anime({
        targets: tripPanelEl,
        opacity: [1, 0],
        scale: [1, 0.92],
        duration: 300,
        easing: 'easeInCubic',
    }).finished;

    tripPanelEl.style.opacity = '0';
    if (onPanelClose) onPanelClose();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ===== Filter Panel =====
let filterPanelEl = null;
let isFilterOpen = false;
let filterState = {
    countries: [],
    yearRange: null,
    searchTerm: '',
};
let onFilterChange = null;

export function initFilterPanel(countries, yearRange, onChange) {
    onFilterChange = onChange;

    filterPanelEl = document.createElement('div');
    filterPanelEl.className = 'filter-panel';
    document.body.appendChild(filterPanelEl);

    updateFilterContent(countries, yearRange);
}

function updateFilterContent(countries, yearRange) {
    const countryNames = {
        JP: '일본', FR: '프랑스', US: '미국', KR: '대한민국', GB: '영국',
        DE: '독일', IT: '이탈리아', ES: '스페인', TH: '태국', VN: '베트남',
        CN: '중국', TW: '대만', AU: '호주', CA: '캐나다', NZ: '뉴질랜드',
    };

    const countryChips = countries.map(code => {
        const name = countryNames[code] || code;
        const active = filterState.countries.includes(code) ? 'active' : '';
        return `<button class="filter-chip ${active}" data-country="${code}">${name}</button>`;
    }).join('');

    const minYear = yearRange?.min ? yearRange.min.getFullYear() : 2020;
    const maxYear = yearRange?.max ? yearRange.max.getFullYear() : new Date().getFullYear();

    filterPanelEl.innerHTML = `
        <div class="filter-panel-title">필터</div>

        <div class="filter-section">
            <div class="filter-section-title">검색</div>
            <input type="text" class="filter-search" placeholder="장소, 메모 검색..."
                   value="${filterState.searchTerm}"
                   style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);
                   background:var(--bg-alt);color:var(--text);font-size:13px;font-family:var(--font-body);
                   outline:none;">
        </div>

        <div class="filter-section">
            <div class="filter-section-title">나라</div>
            <div class="filter-chips">${countryChips || '<span style="color:var(--text-sub);font-size:13px">여행 기록이 없습니다</span>'}</div>
        </div>

        <div class="filter-section">
            <div class="filter-section-title">기간</div>
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:13px;color:var(--text-sub)">${minYear}</span>
                <input type="range" class="filter-year-min" min="${minYear}" max="${maxYear}"
                       value="${filterState.yearRange?.[0] || minYear}"
                       style="flex:1;accent-color:var(--blue);">
                <span style="font-size:13px;color:var(--text-sub)">~</span>
                <input type="range" class="filter-year-max" min="${minYear}" max="${maxYear}"
                       value="${filterState.yearRange?.[1] || maxYear}"
                       style="flex:1;accent-color:var(--blue);">
                <span style="font-size:13px;color:var(--text-sub)">${maxYear}</span>
            </div>
        </div>

        <button class="filter-chip" style="margin-top:16px;width:100%;justify-content:center;
                background:var(--blue);color:white;border-color:var(--blue);text-align:center;"
                id="filter-reset">
            필터 초기화
        </button>
    `;

    // Event listeners
    filterPanelEl.querySelectorAll('[data-country]').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.dataset.country;
            if (filterState.countries.includes(code)) {
                filterState.countries = filterState.countries.filter(c => c !== code);
                btn.classList.remove('active');
            } else {
                filterState.countries.push(code);
                btn.classList.add('active');
            }
            emitFilterChange();
        });
    });

    const searchInput = filterPanelEl.querySelector('.filter-search');
    if (searchInput) {
        let debounce;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                filterState.searchTerm = searchInput.value;
                emitFilterChange();
            }, 300);
        });
    }

    const yearMin = filterPanelEl.querySelector('.filter-year-min');
    const yearMax = filterPanelEl.querySelector('.filter-year-max');
    if (yearMin && yearMax) {
        yearMin.addEventListener('input', () => {
            filterState.yearRange = [parseInt(yearMin.value), parseInt(yearMax.value)];
            emitFilterChange();
        });
        yearMax.addEventListener('input', () => {
            filterState.yearRange = [parseInt(yearMin.value), parseInt(yearMax.value)];
            emitFilterChange();
        });
    }

    const resetBtn = filterPanelEl.querySelector('#filter-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            filterState = { countries: [], yearRange: null, searchTerm: '' };
            updateFilterContent(countries, yearRange);
            emitFilterChange();
        });
    }
}

function emitFilterChange() {
    if (onFilterChange) onFilterChange(filterState);
}

export async function toggleFilterPanel() {
    if (isFilterOpen) {
        await animateFilterClose(filterPanelEl);
    } else {
        await animateFilterOpen(filterPanelEl);
    }
    isFilterOpen = !isFilterOpen;
}

// ===== Timeline Bar =====
let timelineBarEl = null;
let isTimelineVisible = false;

export function initTimeline(trips, onDotClick) {
    timelineBarEl = document.createElement('div');
    timelineBarEl.className = 'timeline-bar';
    document.body.appendChild(timelineBarEl);

    updateTimeline(trips, onDotClick);
}

export function updateTimeline(trips, onDotClick) {
    if (!timelineBarEl || trips.length === 0) return;

    const sorted = [...trips].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const minDate = new Date(sorted[0].startDate);
    const maxDate = new Date(sorted[sorted.length - 1].startDate);
    const range = maxDate - minDate || 1;

    const dots = sorted.map(trip => {
        const pos = ((new Date(trip.startDate) - minDate) / range) * 100;
        return `
            <div class="timeline-dot" style="left:${pos}%"
                 data-trip-id="${trip.id}"
                 title="${trip.title}">
                <div class="timeline-dot-label">${trip.title}<br>${formatShortDate(trip.startDate)}</div>
            </div>
        `;
    }).join('');

    timelineBarEl.innerHTML = `
        <div class="timeline-content">
            <div class="timeline-label">타임라인</div>
            <div class="timeline-track">
                <div class="timeline-line">
                    ${dots}
                </div>
            </div>
            <div class="timeline-range">
                <span>${formatShortDate(sorted[0].startDate)}</span>
                <span>~</span>
                <span>${formatShortDate(sorted[sorted.length - 1].startDate)}</span>
            </div>
        </div>
    `;

    // Click handlers
    timelineBarEl.querySelectorAll('.timeline-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const tripId = dot.dataset.tripId;
            if (onDotClick) onDotClick(tripId);

            // Highlight animation
            anime({
                targets: dot,
                scale: [1, 1.8, 1],
                duration: 500,
                easing: 'easeOutElastic(1, .5)',
            });
        });
    });
}

export function toggleTimeline() {
    isTimelineVisible = !isTimelineVisible;
    // Use CSS class toggle — the timeline-bar has `transition: transform 0.4s ease`
    // and .visible { transform: translateY(0) }. No anime.js needed here.
    timelineBarEl.classList.toggle('visible', isTimelineVisible);
}

// ===== Lightbox =====
let lightboxEl = null;

export function initLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';
    lightboxEl.innerHTML = '<img src="" alt="">';
    document.body.appendChild(lightboxEl);

    lightboxEl.addEventListener('click', () => {
        animateLightboxClose(lightboxEl);
    });

    // Expose globally for inline onclick
    window.__openLightbox = (src) => {
        lightboxEl.querySelector('img').src = src;
        animateLightboxOpen(lightboxEl);
    };
}

// ===== Toast Notifications =====
let toastContainer = null;

export function initToast() {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
}

export async function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    await animateToastIn(toast);

    await new Promise(r => setTimeout(r, duration));

    await animateToastOut(toast);
    toast.remove();
}

// ===== Theme Toggle =====
export function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('meomunjari-theme', next);
    return next;
}

export function initTheme() {
    const stored = localStorage.getItem('meomunjari-theme') || 'light';
    document.documentElement.setAttribute('data-theme', stored);
    return stored;
}

// ===== Helpers =====
function formatDateRange(start, end) {
    if (!start) return '';
    const s = new Date(start);
    const e = end ? new Date(end) : null;

    const sStr = `${s.getFullYear()}년 ${s.getMonth() + 1}월 ${s.getDate()}일`;
    if (!e) return sStr;

    const eStr = `${e.getFullYear()}년 ${e.getMonth() + 1}월 ${e.getDate()}일`;
    return `${sStr} ~ ${eStr}`;
}
