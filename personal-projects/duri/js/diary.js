// ========================================
// 머문자리 - Diary Main Controller (v2)
// ========================================
import { loadDates, getDatesByMonth, getMonthList } from './diary-data.js';
import { initUploadUI, openCreate, openEdit, openDelete } from './diary-upload-ui.js';
import { MONTH_COLORS } from './config.js';
import {
    renderMonthBubbles, renderOverviewCard,
    animateMonthEntrance,
    animateBubbleFocus, animateBubbleUnfocus,
} from './diary-cloud.js';
import { transitionMonthExit, transitionToOverview, transitionFromOverview } from './diary-transitions.js';
import { initDateDetail, openDateDetail, closeDateDetail } from './diary-detail.js';
import {
    animateLoadingScreen, hideLoadingScreen,
    animateHeaderEntrance,
} from './animations.js';
import { initLightbox, initTheme } from './ui.js';

const anime = window.anime;

// View state
const state = {
    mode: 'single-month', // 'single-month' | 'all-months'
    activeMonthKey: null,
    months: [],
    isTransitioning: false,
};

// DOM refs
let monthView, monthViewCanvas, monthViewHeader, monthTitleBtn, monthDateCount;
let monthsOverview, overviewGrid;
let monthNavBar, monthNavPills;
let currentFocusBubble = null;

async function init() {
    initTheme();
    animateLoadingScreen();

    await loadDates();

    // Cache DOM refs
    monthView = document.getElementById('month-view');
    monthViewCanvas = document.getElementById('month-view-canvas');
    monthViewHeader = document.getElementById('month-view-header');
    monthTitleBtn = document.getElementById('month-title-btn');
    monthDateCount = document.getElementById('month-date-count');
    monthsOverview = document.getElementById('months-overview');
    overviewGrid = document.getElementById('overview-grid');
    monthNavBar = document.getElementById('month-nav-bar');
    monthNavPills = document.getElementById('month-nav-pills');

    // Init UI
    initDateDetail(handleDetailClose);
    initLightbox();
    initUploadUI(refreshAfterUpload);

    // Expose edit/delete for the detail modal's button handlers.
    // closeDateDetail runs first so the detail modal is dismissed before
    // the upload/delete panel opens.
    window.__editEntry = (entry) => {
        closeDateDetail();
        openEdit(entry);
    };
    window.__deleteEntry = (entry) => {
        closeDateDetail();
        openDelete(entry);
    };

    // Wire upload FAB
    const fab = document.getElementById('upload-fab');
    if (fab) fab.addEventListener('click', openCreate);

    // Build month list
    state.months = getMonthList();
    state.activeMonthKey = state.months[state.months.length - 1]; // start at latest

    // Build month nav bar
    buildMonthNav();

    // Click month title → open overview
    monthTitleBtn.addEventListener('click', enterOverview);

    // Overview button in nav bar
    document.getElementById('btn-overview').addEventListener('click', enterOverview);

    // Swipe gestures & pull-to-refresh
    setupSwipe();
    setupLongPress();

    // Window resize → re-render current month
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (state.mode === 'single-month') {
                renderSingleMonth(state.activeMonthKey, false);
            }
        }, 200);
    });

    // Hide loading, show content
    await new Promise(r => setTimeout(r, 600));
    await hideLoadingScreen();

    // Render and animate initial month (or empty state if no entries exist yet)
    if (state.activeMonthKey) {
        renderSingleMonth(state.activeMonthKey, false);
        await animateMonthEntrance(monthViewCanvas, state.activeMonthKey);
    } else {
        renderEmptyState();
    }

    animateHeaderEntrance();

    // Show month nav bar
    monthNavBar.classList.add('visible');
    anime({ targets: monthNavBar, opacity: [0, 1], duration: 500, easing: 'easeOutCubic' });
}

function renderEmptyState() {
    monthTitleBtn.textContent = '아직 기록이 없어요';
    monthDateCount.textContent = '오른쪽 아래 + 버튼으로 첫 기록을 남겨보세요';
    monthViewCanvas.innerHTML = '';
}

// ===== Single Month Rendering =====
function renderSingleMonth(monthKey, animate = true) {
    const entries = getDatesByMonth(monthKey);
    const [year, month] = monthKey.split('-');
    const monthNum = parseInt(month);
    const accent = MONTH_COLORS[monthNum] || '#5A9CB5';

    // Update header
    monthTitleBtn.textContent = `${year}년 ${monthNum}월`;
    monthDateCount.textContent = `${entries.length}개의 기록`;

    // Set accent color on nav bar
    document.documentElement.style.setProperty('--month-accent', accent);

    // Render bubbles
    renderMonthBubbles(monthViewCanvas, monthKey, entries, handleBubbleClick);

    // Update nav bar active state
    monthNavPills.querySelectorAll('.month-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.month === monthKey);
    });

    // Scroll active pill into view
    const activeBtn = monthNavPills.querySelector(`.month-nav-btn[data-month="${monthKey}"]`);
    if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

// ===== Month Switching =====
async function switchMonth(newMonthKey) {
    if (newMonthKey === state.activeMonthKey || state.isTransitioning) return;
    state.isTransitioning = true;

    // Determine direction
    const oldIndex = state.months.indexOf(state.activeMonthKey);
    const newIndex = state.months.indexOf(newMonthKey);
    const direction = newIndex > oldIndex ? 'forward' : 'backward';

    // Exit animation
    await transitionMonthExit(monthViewCanvas, direction);

    // Update state and render
    state.activeMonthKey = newMonthKey;
    renderSingleMonth(newMonthKey, false);

    // Entrance animation
    await animateMonthEntrance(monthViewCanvas, newMonthKey);

    state.isTransitioning = false;
}

// ===== Overview =====
async function enterOverview() {
    if (state.mode === 'all-months' || state.isTransitioning) return;
    state.isTransitioning = true;
    state.mode = 'all-months';

    // Grow the cream strip down to cover the 전체 보기 title. CSS height
    // transition on .top-strip handles the animation.
    document.body.classList.add('overview-mode');

    // Build overview grid grouped by year
    overviewGrid.innerHTML = '';
    let currentYear = null;
    state.months.forEach(monthKey => {
        const year = monthKey.split('-')[0];
        if (year !== currentYear) {
            currentYear = year;
            const yearHeader = document.createElement('div');
            yearHeader.className = 'overview-year-header';
            yearHeader.textContent = year;
            overviewGrid.appendChild(yearHeader);
        }
        const entries = getDatesByMonth(monthKey);
        const card = renderOverviewCard(monthKey, entries, exitOverview);
        overviewGrid.appendChild(card);
    });

    await transitionToOverview(monthView, monthsOverview);
    state.isTransitioning = false;
}

async function exitOverview(monthKey) {
    if (state.mode === 'single-month' || state.isTransitioning) return;
    state.isTransitioning = true;
    state.mode = 'single-month';

    // Hide the month title so it fades in once the strip has shrunk.
    anime.set(monthViewHeader, { opacity: 0, translateY: -8 });

    // Shrink the cream strip back to just the logo row. CSS height
    // transition on .top-strip runs concurrently with the view crossfade.
    document.body.classList.remove('overview-mode');

    await transitionFromOverview(monthsOverview, monthView);

    state.activeMonthKey = monthKey;
    renderSingleMonth(monthKey, false);

    // Fade the month title into the space the strip just vacated,
    // then let animateMonthEntrance bring in the date bubbles.
    anime({
        targets: monthViewHeader,
        opacity: [0, 1],
        translateY: [-8, 0],
        duration: 550,
        easing: 'easeOutCubic',
    });

    await animateMonthEntrance(monthViewCanvas, monthKey);

    state.isTransitioning = false;
}

// ===== Month Nav Bar =====
function buildMonthNav() {
    state.months.forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const btn = document.createElement('button');
        btn.className = 'month-nav-btn';
        btn.dataset.month = monthKey;
        btn.textContent = `${year}.${month}`;

        btn.addEventListener('click', () => {
            if (state.mode === 'all-months') {
                exitOverview(monthKey);
            } else {
                switchMonth(monthKey);
            }
        });

        monthNavPills.appendChild(btn);
    });
}

// ===== Swipe Gesture =====
function setupSwipe() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    monthViewCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }
    }, { passive: true });

    monthViewCanvas.addEventListener('touchend', (e) => {
        if (state.isTransitioning) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const dt = Date.now() - touchStartTime;

        // Only trigger on horizontal swipes (dx > dy), ignore vertical scrolls
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
            const currentIndex = state.months.indexOf(state.activeMonthKey);
            if (dx < 0 && currentIndex < state.months.length - 1) {
                // Swipe left → next month
                switchMonth(state.months[currentIndex + 1]);
            } else if (dx > 0 && currentIndex > 0) {
                // Swipe right → previous month
                switchMonth(state.months[currentIndex - 1]);
            }
        }
    }, { passive: true });
}

// ===== Bubble Click =====
let suppressNextBubbleClick = false;

function handleBubbleClick(entry, bubble, container) {
    if (state.isTransitioning) return;
    if (suppressNextBubbleClick) {
        suppressNextBubbleClick = false;
        return;
    }

    if (currentFocusBubble) {
        animateBubbleUnfocus(currentFocusBubble, monthViewCanvas);
    }

    currentFocusBubble = bubble;
    animateBubbleFocus(bubble, monthViewCanvas);
    openDateDetail(entry);
}

// ===== Long-press → edit =====
function setupLongPress() {
    let pressTimer = null;
    let pressedBubble = null;
    let startX = 0, startY = 0;
    const LONG_PRESS_MS = 550;
    const MOVE_THRESHOLD = 10;

    const start = (e) => {
        const bubble = e.target.closest('.date-bubble');
        if (!bubble) return;
        const point = e.touches ? e.touches[0] : e;
        startX = point.clientX;
        startY = point.clientY;
        pressedBubble = bubble;
        pressTimer = setTimeout(() => {
            const id = bubble.dataset.id;
            const entry = getDatesByMonth(state.activeMonthKey).find(d => d.id === id);
            if (entry) {
                suppressNextBubbleClick = true;
                openEdit(entry);
            }
            pressTimer = null;
            pressedBubble = null;
        }, LONG_PRESS_MS);
    };

    const move = (e) => {
        if (!pressTimer) return;
        const point = e.touches ? e.touches[0] : e;
        const dx = Math.abs(point.clientX - startX);
        const dy = Math.abs(point.clientY - startY);
        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
            clearTimeout(pressTimer);
            pressTimer = null;
            pressedBubble = null;
        }
    };

    const end = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
            pressedBubble = null;
        }
    };

    monthViewCanvas.addEventListener('mousedown', start);
    monthViewCanvas.addEventListener('mousemove', move);
    monthViewCanvas.addEventListener('mouseup', end);
    monthViewCanvas.addEventListener('mouseleave', end);
    monthViewCanvas.addEventListener('touchstart', start, { passive: true });
    monthViewCanvas.addEventListener('touchmove', move, { passive: true });
    monthViewCanvas.addEventListener('touchend', end);
    monthViewCanvas.addEventListener('touchcancel', end);
}

// ===== Pull-to-refresh =====
function setupPullToRefresh() {
    const threshold = 120;
    let startY = 0;
    let pulling = false;

    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>`;
    monthViewCanvas.parentNode.insertBefore(indicator, monthViewCanvas);

    monthViewCanvas.addEventListener('touchstart', (e) => {
        if (monthViewCanvas.scrollTop <= 0 && e.touches.length === 1) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });

    monthViewCanvas.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        const dy = e.touches[0].clientY - startY;
        if (dy > 0 && monthViewCanvas.scrollTop <= 0) {
            const progress = Math.min(dy / threshold, 1);
            indicator.style.opacity = progress;
            indicator.style.transform = `translateY(${Math.min(dy * 0.4, 60)}px)`;
            indicator.querySelector('svg').style.transform = `rotate(${progress * 180}deg)`;
        } else {
            indicator.style.opacity = 0;
            indicator.style.transform = 'translateY(0)';
        }
    }, { passive: true });

    monthViewCanvas.addEventListener('touchend', async () => {
        if (!pulling) return;
        pulling = false;
        const wasTriggered = parseFloat(indicator.style.opacity) >= 1;
        indicator.style.opacity = 0;
        indicator.style.transform = 'translateY(0)';
        if (wasTriggered) {
            indicator.style.opacity = 1;
            indicator.querySelector('svg').style.animation = 'ptr-spin 0.8s linear infinite';
            await refreshAfterUpload();
            indicator.querySelector('svg').style.animation = '';
            indicator.style.opacity = 0;
        }
    });
}

function setupOverviewPullToRefresh() {
    const threshold = 120;
    let startY = 0;
    let pulling = false;

    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>`;
    monthsOverview.insertBefore(indicator, monthsOverview.firstChild);

    monthsOverview.addEventListener('touchstart', (e) => {
        if (monthsOverview.scrollTop <= 0 && e.touches.length === 1) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });

    monthsOverview.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        const dy = e.touches[0].clientY - startY;
        if (dy > 0 && monthsOverview.scrollTop <= 0) {
            const progress = Math.min(dy / threshold, 1);
            indicator.style.opacity = progress;
            indicator.style.transform = `translateY(${Math.min(dy * 0.4, 60)}px)`;
            indicator.querySelector('svg').style.transform = `rotate(${progress * 180}deg)`;
        } else {
            indicator.style.opacity = 0;
            indicator.style.transform = 'translateY(0)';
        }
    }, { passive: true });

    monthsOverview.addEventListener('touchend', async () => {
        if (!pulling) return;
        pulling = false;
        const wasTriggered = parseFloat(indicator.style.opacity) >= 1;
        indicator.style.opacity = 0;
        indicator.style.transform = 'translateY(0)';
        if (wasTriggered) {
            indicator.style.opacity = 1;
            indicator.querySelector('svg').style.animation = 'ptr-spin 0.8s linear infinite';
            await refreshAfterUpload();
            if (state.mode === 'all-months') {
                overviewGrid.innerHTML = '';
                let currentYear = null;
                state.months.forEach(monthKey => {
                    const year = monthKey.split('-')[0];
                    if (year !== currentYear) {
                        currentYear = year;
                        const yearHeader = document.createElement('div');
                        yearHeader.className = 'overview-year-header';
                        yearHeader.textContent = `${year}`;
                        overviewGrid.appendChild(yearHeader);
                    }
                    const entries = getDatesByMonth(monthKey);
                    const card = renderOverviewCard(monthKey, entries, exitOverview);
                    overviewGrid.appendChild(card);
                });
            }
            indicator.querySelector('svg').style.animation = '';
            indicator.style.opacity = 0;
        }
    });
}

// ===== Refresh after upload/edit/delete =====
async function refreshAfterUpload() {
    await loadDates();
    state.months = getMonthList();
    // If active month no longer exists (e.g., last entry deleted), fall back to latest
    if (!state.months.includes(state.activeMonthKey)) {
        state.activeMonthKey = state.months[state.months.length - 1];
    }
    // Rebuild nav pills
    monthNavPills.innerHTML = '';
    buildMonthNav();
    if (state.mode === 'single-month' && state.activeMonthKey) {
        renderSingleMonth(state.activeMonthKey, false);
    }
}

function handleDetailClose() {
    if (currentFocusBubble) {
        animateBubbleUnfocus(currentFocusBubble, monthViewCanvas);
        currentFocusBubble = null;
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
