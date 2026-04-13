// ========================================
// Diary Date Detail Modal
// ========================================
import { staggerFadeIn } from './animations.js';

const anime = window.anime;

let overlayEl = null;
let panelEl = null;
let isOpen = false;
let onCloseCallback = null;

// ===== Smart image layout =====
// Preloads images off-screen to get dimensions, then builds the final
// row structure in one shot — no DOM rearrangement, no flash.
function preloadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ src, w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ src, w: 1, h: 1 });
        img.src = src;
    });
}

function buildSmartImagesHtml(imageInfos) {
    if (imageInfos.length === 0) return '';
    if (imageInfos.length === 1) {
        const { src } = imageInfos[0];
        return `<img src="${escapeHtml(src)}" alt="사진" onclick="window.__openLightbox('${escapeHtml(src)}')">`;
    }

    let html = '';
    const portraitBuf = [];

    const flushPortraits = () => {
        if (!portraitBuf.length) return;
        html += '<div class="img-row img-row-pair">';
        portraitBuf.splice(0).forEach(({ src }) => {
            html += `<img src="${escapeHtml(src)}" alt="사진" onclick="window.__openLightbox('${escapeHtml(src)}')">`;
        });
        html += '</div>';
    };

    imageInfos.forEach(info => {
        const ratio = info.w / info.h;
        if (ratio > 1.2) {
            flushPortraits();
            html += `<div class="img-row img-row-full"><img src="${escapeHtml(info.src)}" alt="사진" onclick="window.__openLightbox('${escapeHtml(info.src)}')"></div>`;
        } else {
            portraitBuf.push(info);
            if (portraitBuf.length === 2) flushPortraits();
        }
    });
    flushPortraits();
    return html;
}

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

    // Preload images to get dimensions for smart layout
    const imageInfos = await Promise.all(images.map(src => preloadImage(src)));
    const imagesHtml = buildSmartImagesHtml(imageInfos);

    panelEl.innerHTML = `
        <div class="date-detail-titlebar">
            <div class="date-detail-title">${formatKoreanDate(dateEntry.date)}</div>
            <button class="date-detail-close" onclick="window.__closeDateDetail()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
        <div class="date-detail-body">
            ${dateEntry.description ? `
                <div class="date-detail-description">${escapeHtml(dateEntry.description)}</div>
            ` : ''}

            ${images.length > 0 ? `
                <div class="trip-panel-images">${imagesHtml}</div>
            ` : ''}

            <div class="date-detail-actions">
                <button class="date-detail-edit-btn" id="detail-edit-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    수정
                </button>
                <button class="date-detail-delete-btn" id="detail-delete-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    삭제
                </button>
            </div>
        </div>
    `;

    // Animate in. Scale/opacity live in CSS transitions (triggered by
    // .visible) so anime.js never rewrites transform and drops the
    // translate(-50%, -50%) centering.
    panelEl.style.pointerEvents = 'auto';
    overlayEl.classList.add('visible');
    anime({ targets: overlayEl, opacity: [0, 1], duration: 400, easing: 'easeOutQuad' });

    // Bind edit/delete buttons. Uses addEventListener (not inline onclick)
    // to safely pass the entry object without JSON-in-attribute escaping issues.
    const editBtn = panelEl.querySelector('#detail-edit-btn');
    const deleteBtn = panelEl.querySelector('#detail-delete-btn');
    if (editBtn && window.__editEntry) editBtn.addEventListener('click', () => window.__editEntry(dateEntry));
    if (deleteBtn && window.__deleteEntry) deleteBtn.addEventListener('click', () => window.__deleteEntry(dateEntry));

    // Hide body items BEFORE panel becomes visible, so the panel
    // fade-in doesn't reveal them prematurely.
    const bodyItems = panelEl.querySelectorAll('.date-detail-description, .trip-panel-images, .date-detail-actions');
    anime.set(bodyItems, { opacity: 0, translateY: 15 });

    // Force a reflow so the class add triggers a transition from opacity 0.
    void panelEl.offsetWidth;
    panelEl.classList.add('visible');

    await new Promise(r => setTimeout(r, 500));

    // Now reveal body content with stagger
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
