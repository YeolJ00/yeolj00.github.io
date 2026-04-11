// ========================================
// Diary Date Detail Modal
// ========================================
import { staggerFadeIn } from './animations.js';

const anime = window.anime;

let overlayEl = null;
let panelEl = null;
let isOpen = false;
let onCloseCallback = null;

export function initDateDetail(onClose) {
    onCloseCallback = onClose;

    overlayEl = document.createElement('div');
    overlayEl.className = 'date-detail-overlay';
    document.body.appendChild(overlayEl);

    panelEl = document.createElement('div');
    panelEl.className = 'date-detail-panel';
    document.body.appendChild(panelEl);

    overlayEl.addEventListener('click', (e) => {
        if (e.target === overlayEl) closeDateDetail();
    });

    // Expose globally for inline onclick
    window.__closeDateDetail = closeDateDetail;
    window.__openLightbox = window.__openLightbox || ((src) => {
        // Will be overridden by initLightbox if available
        console.log('Lightbox:', src);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatKoreanDate(dateStr) {
    const d = new Date(dateStr);
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`;
}

export async function openDateDetail(dateEntry) {
    if (isOpen) await closeDateDetail();
    isOpen = true;

    const images = dateEntry.images || [];
    const imagesHtml = images.map(src =>
        `<img src="${escapeHtml(src)}" alt="사진" loading="lazy" onclick="window.__openLightbox('${escapeHtml(src)}')">`
    ).join('');

    panelEl.innerHTML = `
        <div class="date-detail-header">
            <img src="${escapeHtml(dateEntry.thumbnail || images[0] || '')}" alt="">
            <div class="date-detail-header-overlay">
                <div class="date-detail-title">${formatKoreanDate(dateEntry.date)}</div>
            </div>
            <button class="date-detail-close" onclick="window.__closeDateDetail()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
        <div class="date-detail-body">
            <div class="trip-panel-dates">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>${formatKoreanDate(dateEntry.date)}</span>
            </div>

            ${dateEntry.description ? `
                <div class="trip-panel-section-title">기록</div>
                <div class="trip-panel-comment">${escapeHtml(dateEntry.description)}</div>
            ` : ''}

            ${images.length > 0 ? `
                <div class="trip-panel-section-title">사진</div>
                <div class="trip-panel-images">${imagesHtml}</div>
            ` : ''}
        </div>
    `;

    // Animate in. Scale/opacity live in CSS transitions (triggered by
    // .visible) so anime.js never rewrites transform and drops the
    // translate(-50%, -50%) centering.
    panelEl.style.pointerEvents = 'auto';
    overlayEl.classList.add('visible');
    anime({ targets: overlayEl, opacity: [0, 1], duration: 400, easing: 'easeOutQuad' });

    // Force a reflow so the class add triggers a transition from opacity 0.
    void panelEl.offsetWidth;
    panelEl.classList.add('visible');

    await new Promise(r => setTimeout(r, 500));

    // Stagger body content
    const bodyItems = panelEl.querySelectorAll('.trip-panel-dates, .trip-panel-section-title, .trip-panel-comment, .trip-panel-images');
    staggerFadeIn(bodyItems, 80);
}

export async function closeDateDetail() {
    if (!isOpen) return;
    isOpen = false;

    panelEl.style.pointerEvents = 'none';

    anime({
        targets: overlayEl, opacity: [1, 0], duration: 300, easing: 'easeInQuad',
        complete: () => overlayEl.classList.remove('visible'),
    });

    panelEl.classList.remove('visible');
    await new Promise(r => setTimeout(r, 500));

    if (onCloseCallback) onCloseCallback();
}
