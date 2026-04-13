// ========================================
// Diary Cloud Layout, Rendering & Entrance Presets
// ========================================
import { DIARY_ANIM, MONTH_COLORS } from './config.js';

const anime = window.anime;

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function getMonthNumber(monthKey) {
    return parseInt(monthKey.split('-')[1]);
}

function getMonthAccent(monthKey) {
    return MONTH_COLORS[getMonthNumber(monthKey)] || '#5A9CB5';
}

// ===== Organic flow layout (sorted top→bottom, left→right) =====
export function computeMonthLayout(dateEntries, canvasWidth, canvasHeight) {
    const isMobile = window.innerWidth <= 768;
    const count = dateEntries.length;

    // Adaptive bubble size: fewer dates → larger, more dates → smaller
    let size;
    if (count <= 2) size = isMobile ? 140 : 180;
    else if (count <= 4) size = isMobile ? 120 : 155;
    else if (count <= 6) size = isMobile ? 100 : 135;
    else size = isMobile ? 90 : 115;

    const gapX = size * 0.2;
    const gapY = size * 0.8;
    const sorted = [...dateEntries].sort((a, b) => a.date.localeCompare(b.date));

    // Calculate grid: how many columns fit in the usable area
    const usableWidth = canvasWidth * 0.8;
    const cols = Math.max(2, Math.floor(usableWidth / (size + gapX)));

    // Top-align below the month header (header ~100px + title ~70px + margin)
    const gridWidth = cols * (size + gapX) - gapX;
    const rows = Math.ceil(count / cols);
    const startX = (canvasWidth - gridWidth) / 2;
    const startY = 210;

    return sorted.map((entry, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);

        // Base grid position
        const baseX = startX + col * (size + gapX);
        const baseY = startY + row * (size + gapY);

        // Add organic jitter
        const x = baseX + rand(-8, 8);
        const y = baseY + rand(-8, 8);
        const rotation = rand(-5, 5);

        return { entry, x, y, rotation, size };
    });
}

// ===== Render bubbles into a container =====
export function renderMonthBubbles(container, monthKey, dateEntries, onBubbleClick) {
    container.innerHTML = '';
    const accent = getMonthAccent(monthKey);
    container.style.setProperty('--month-accent', accent);

    const layout = computeMonthLayout(dateEntries, container.clientWidth, container.clientHeight);

    layout.forEach(({ entry, x, y, rotation, size }) => {
        const bubble = document.createElement('div');
        bubble.className = 'date-bubble';
        bubble.dataset.id = entry.id;
        bubble.style.width = `${size}px`;
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        bubble.style.transform = `rotate(${rotation}deg)`;
        bubble.dataset.baseRotation = rotation;

        // Polaroid image area
        const img = document.createElement('div');
        img.className = 'date-bubble-img';
        img.style.backgroundImage = `url(${entry.thumbnail})`;
        bubble.appendChild(img);

        // Date label in the white bottom strip — "1/30 (금)" format
        const WEEKDAYS_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
        const dateLabel = document.createElement('div');
        dateLabel.className = 'date-bubble-date';
        const d = new Date(entry.date);
        dateLabel.textContent = `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS_SHORT[d.getDay()]})`;
        bubble.appendChild(dateLabel);

        bubble.addEventListener('click', () => onBubbleClick(entry, bubble, container));

        container.appendChild(bubble);
    });

    // Bubbles are absolutely positioned so they don't create content height.
    // Insert a spacer div to make the container scrollable.
    if (layout.length) {
        const maxBottom = Math.max(...layout.map(l => l.y + l.size)) + 100;
        const spacer = document.createElement('div');
        spacer.style.height = `${maxBottom}px`;
        spacer.style.pointerEvents = 'none';
        container.appendChild(spacer);
    }

    return layout;
}

// ===== Render overview card — stacked polaroids =====
export function renderOverviewCard(monthKey, dateEntries, onClick) {
    const [year, month] = monthKey.split('-');
    const card = document.createElement('div');
    card.className = 'overview-month-card';
    card.dataset.month = monthKey;

    // Create a stack of 1-3 polaroids
    const count = dateEntries.length;
    const stackCount = Math.min(count, 3);
    const thumbs = dateEntries.slice(0, stackCount).map(e => e.thumbnail);

    // Rotation offsets for stacking (back → front)
    const rotations = [
        [-12, -15, -8],  // 3 polaroids
        [-8, 5],         // 2 polaroids
        [0],             // 1 polaroid
    ];
    const offsets = [
        [{ x: -8, y: -4 }, { x: 10, y: -6 }, { x: 0, y: 2 }],
        [{ x: -6, y: -3 }, { x: 6, y: 2 }],
        [{ x: 0, y: 0 }],
    ];
    const rots = rotations[3 - stackCount];
    const offs = offsets[3 - stackCount];

    let stackHtml = '';
    thumbs.forEach((src, i) => {
        const r = rots[i];
        const o = offs[i];
        const z = i + 1;
        stackHtml += `<div class="overview-card-polaroid" style="transform:translate(calc(-50% + ${o.x}px), calc(-50% + ${o.y}px)) rotate(${r}deg); z-index:${z};">
            <img src="${src}" alt="" loading="lazy">
        </div>`;
    });

    card.innerHTML = `
        <div class="overview-card-stack">${stackHtml}</div>
        <div class="overview-card-label">${year}년 ${parseInt(month)}월</div>
        <div class="overview-card-count">${count}개의 기록</div>
    `;

    card.addEventListener('click', () => onClick(monthKey));

    return card;
}

// ===== Entrance animations — random per bubble =====
// Each bubble independently picks one of: flip-in, place, drop-and-settle.
export function animateMonthEntrance(container, monthKey) {
    const bubbles = container.querySelectorAll('.date-bubble');
    if (!bubbles.length) return Promise.resolve();

    const STAGGER = 60;
    const els = Array.from(bubbles);

    anime.set(els, { opacity: 0 });

    return anime({
        targets: els,
        opacity: [0, 1],
        delay: anime.stagger(STAGGER),
        duration: 120,
        easing: 'linear',
    }).finished;
}

// ===== Click interaction: focus/retreat =====
export function animateBubbleFocus(clickedBubble, container) {
    const others = container.querySelectorAll('.date-bubble:not([data-id="' + clickedBubble.dataset.id + '"])');

    anime({
        targets: clickedBubble,
        scale: 1.15,
        duration: 400,
        easing: 'easeOutCubic',
    });

    anime({
        targets: others,
        opacity: 0.35,
        duration: 500,
        easing: 'easeOutCubic',
    });
}

export function animateBubbleUnfocus(clickedBubble, container) {
    const others = container.querySelectorAll('.date-bubble:not([data-id="' + clickedBubble.dataset.id + '"])');

    anime({
        targets: clickedBubble,
        scale: 1,
        duration: 400,
        easing: 'easeOutCubic',
    });

    anime({
        targets: others,
        opacity: 1,
        duration: 500,
        easing: 'easeOutCubic',
    });
}
