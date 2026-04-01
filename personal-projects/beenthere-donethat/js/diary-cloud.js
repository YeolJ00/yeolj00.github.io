// ========================================
// Diary Cloud Layout, Rendering & Entrance Presets
// ========================================
import { DIARY_ANIM, MONTH_COLORS, MONTH_ENTRANCE_PRESETS } from './config.js';

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

    const gap = size * 0.2;
    const sorted = [...dateEntries].sort((a, b) => a.date.localeCompare(b.date));

    // Calculate grid: how many columns fit in the usable area
    const usableWidth = canvasWidth * 0.8;
    const usableHeight = canvasHeight * 0.6;
    const cols = Math.max(2, Math.floor(usableWidth / (size + gap)));

    // Center the grid
    const gridWidth = cols * (size + gap) - gap;
    const rows = Math.ceil(count / cols);
    const gridHeight = rows * (size + gap) - gap;
    const startX = (canvasWidth - gridWidth) / 2;
    const startY = (canvasHeight - gridHeight) / 2 + 20; // offset below header

    return sorted.map((entry, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);

        // Base grid position
        const baseX = startX + col * (size + gap);
        const baseY = startY + row * (size + gap);

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

        // Date label in the white bottom strip
        const dateLabel = document.createElement('div');
        dateLabel.className = 'date-bubble-date';
        const d = new Date(entry.date);
        dateLabel.textContent = `${d.getMonth() + 1}/${d.getDate()}`;
        bubble.appendChild(dateLabel);

        bubble.addEventListener('click', () => onBubbleClick(entry, bubble, container));

        container.appendChild(bubble);
    });

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

// ===== Entrance animations (12 presets) =====
export function animateMonthEntrance(container, monthKey) {
    const monthNum = getMonthNumber(monthKey);
    const presetName = MONTH_ENTRANCE_PRESETS[monthNum] || 'fadeSpiral';
    const bubbles = container.querySelectorAll('.date-bubble');
    if (!bubbles.length) return Promise.resolve();

    anime.set(bubbles, { opacity: 0, scale: 0 });

    const presets = {
        // Jan: Snowfall - drop from above with drift
        snowfall(els) {
            return anime({
                targets: els,
                opacity: [0, 1],
                translateY: [-80, 0],
                translateX: () => [rand(-20, 20), 0],
                scale: [0.6, 1],
                delay: anime.stagger(70),
                duration: 700,
                easing: 'easeOutCubic',
            }).finished;
        },

        // Feb: Heartbeat - double pulse scale
        heartbeat(els) {
            return anime({
                targets: els,
                opacity: [0, 1],
                scale: [0, 1.12, 0.95, 1],
                delay: anime.stagger(80),
                duration: 800,
                easing: 'easeOutQuad',
            }).finished;
        },

        // Mar: Bloom - scale from center
        bloom(els) {
            return anime({
                targets: els,
                opacity: [0, 1],
                scale: [0, 1],
                delay: anime.stagger(60, { from: 'center' }),
                duration: 600,
                easing: 'spring(1, 80, 10, 0)',
            }).finished;
        },

        // Apr: Raindrops - bounce from above
        raindrops(els) {
            return anime({
                targets: els,
                opacity: [0, 1],
                translateY: [-40, 5, 0],
                scale: [0.7, 1],
                delay: anime.stagger(60, { direction: 'normal' }),
                duration: 700,
                easing: 'easeOutBounce',
            }).finished;
        },

        // May: Spiral in with rotation
        spiralIn(els) {
            return anime({
                targets: els,
                opacity: [0, 1],
                rotate: function(el) {
                    const base = parseFloat(el.dataset.baseRotation) || 0;
                    return [base + 180, base];
                },
                scale: [0, 1],
                delay: anime.stagger(70),
                duration: 700,
                easing: 'easeOutExpo',
            }).finished;
        },

        // Jun: Wave from left
        wave(els) {
            return anime({
                targets: els,
                opacity: [0, 1],
                translateX: [-60, 0],
                scale: [0.8, 1],
                delay: anime.stagger(50, { from: 'first' }),
                duration: 600,
                easing: 'easeOutCubic',
            }).finished;
        },

        // Jul: Fireworks - all start from center, fly outward
        fireworks(els) {
            const cx = container.clientWidth / 2;
            const cy = container.clientHeight / 2;
            Array.from(els).forEach(el => {
                const origLeft = parseFloat(el.style.left);
                const origTop = parseFloat(el.style.top);
                const size = parseFloat(el.style.width);
                el.dataset.origLeft = origLeft;
                el.dataset.origTop = origTop;
                anime.set(el, {
                    translateX: cx - origLeft - size / 2,
                    translateY: cy - origTop - size / 2,
                    opacity: 0,
                    scale: 0.3,
                });
            });
            return anime({
                targets: els,
                translateX: 0,
                translateY: 0,
                opacity: 1,
                scale: 1,
                delay: anime.stagger(40),
                duration: 700,
                easing: 'spring(1, 70, 12, 0)',
            }).finished;
        },

        // Aug: Cascade - stagger by position
        cascade(els) {
            const sorted = Array.from(els).sort((a, b) => {
                const aVal = parseFloat(a.style.left) + parseFloat(a.style.top);
                const bVal = parseFloat(b.style.left) + parseFloat(b.style.top);
                return aVal - bVal;
            });
            anime.set(sorted, { opacity: 0, scale: 0, translateY: -30 });
            return anime({
                targets: sorted,
                opacity: [0, 1],
                scale: [0, 1],
                translateY: [-30, 0],
                delay: anime.stagger(60),
                duration: 600,
                easing: 'easeOutCubic',
            }).finished;
        },

        // Sep: Fade spiral - index-based stagger with gentle rotate
        fadeSpiral(els) {
            return anime({
                targets: els,
                opacity: [0, 1],
                scale: [0.5, 1],
                rotate: function(el) {
                    const base = parseFloat(el.dataset.baseRotation) || 0;
                    return [base - 15, base];
                },
                delay: anime.stagger(80),
                duration: 700,
                easing: 'easeOutExpo',
            }).finished;
        },

        // Oct: Scatter - from random offscreen positions
        scatter(els) {
            Array.from(els).forEach(el => {
                anime.set(el, {
                    translateX: rand(-200, 200),
                    translateY: rand(-200, 200),
                    opacity: 0,
                    scale: 0.4,
                    rotate: rand(-30, 30),
                });
            });
            return anime({
                targets: els,
                translateX: 0,
                translateY: 0,
                opacity: 1,
                scale: 1,
                rotate: function(el) { return parseFloat(el.dataset.baseRotation) || 0; },
                delay: anime.stagger(50),
                duration: 800,
                easing: 'easeOutCubic',
            }).finished;
        },

        // Nov: Curtain drop - row by row from top
        curtainDrop(els) {
            const sorted = Array.from(els).sort((a, b) =>
                parseFloat(a.style.top) - parseFloat(b.style.top)
            );
            anime.set(sorted, { opacity: 0, translateY: -50, scale: 0.8 });
            return anime({
                targets: sorted,
                opacity: [0, 1],
                translateY: [-50, 0],
                scale: [0.8, 1],
                delay: anime.stagger(70),
                duration: 600,
                easing: 'easeOutCubic',
            }).finished;
        },

        // Dec: Twinkle - flash + scale
        twinkle(els) {
            return anime({
                targets: els,
                opacity: [0, 1, 0.6, 1],
                scale: [0.6, 1.1, 1],
                delay: anime.stagger(50, { direction: 'normal' }),
                duration: 800,
                easing: 'easeOutQuad',
            }).finished;
        },
    };

    const fn = presets[presetName] || presets.fadeSpiral;
    return fn(bubbles);
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
