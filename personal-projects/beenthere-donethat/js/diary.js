// ========================================
// 머문자리 - Diary Main Controller (v2)
// ========================================
import { loadDates, getDatesByMonth, getMonthList } from './diary-data.js';
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

    // Build month list
    state.months = getMonthList();
    state.activeMonthKey = state.months[state.months.length - 1]; // start at latest

    // Build month nav bar
    buildMonthNav();

    // Click month title → open overview
    monthTitleBtn.addEventListener('click', enterOverview);

    // Overview button in nav bar
    document.getElementById('btn-overview').addEventListener('click', enterOverview);

    // Swipe gestures
    setupSwipe();

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

    // Render and animate initial month
    renderSingleMonth(state.activeMonthKey, false);
    await animateMonthEntrance(monthViewCanvas, state.activeMonthKey);

    animateHeaderEntrance();

    // Show month nav bar
    monthNavBar.classList.add('visible');
    anime({ targets: monthNavBar, opacity: [0, 1], duration: 500, easing: 'easeOutCubic' });
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

    await transitionFromOverview(monthsOverview, monthView);

    state.activeMonthKey = monthKey;
    renderSingleMonth(monthKey, false);
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
    let touchStartTime = 0;

    monthViewCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartTime = Date.now();
        }
    }, { passive: true });

    monthViewCanvas.addEventListener('touchend', (e) => {
        if (state.isTransitioning) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dt = Date.now() - touchStartTime;

        // Require min 50px swipe within 500ms
        if (Math.abs(dx) > 50 && dt < 500) {
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
function handleBubbleClick(entry, bubble, container) {
    if (state.isTransitioning) return;

    if (currentFocusBubble) {
        animateBubbleUnfocus(currentFocusBubble, monthViewCanvas);
    }

    currentFocusBubble = bubble;
    animateBubbleFocus(bubble, monthViewCanvas);
    openDateDetail(entry);
}

function handleDetailClose() {
    if (currentFocusBubble) {
        animateBubbleUnfocus(currentFocusBubble, monthViewCanvas);
        currentFocusBubble = null;
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
