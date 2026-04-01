// ========================================
// Diary View Transitions
// ========================================
const anime = window.anime;

// ===== Month-to-month transition =====
export async function transitionMonthExit(container, direction) {
    const bubbles = container.querySelectorAll('.date-bubble');
    if (!bubbles.length) return;

    const exitX = direction === 'forward' ? -60 : 60;

    await anime({
        targets: bubbles,
        translateX: exitX,
        opacity: 0,
        delay: anime.stagger(25, { direction: direction === 'forward' ? 'normal' : 'reverse' }),
        duration: 300,
        easing: 'easeInCubic',
    }).finished;
}

// ===== Single month → All months overview =====
export async function transitionToOverview(monthViewEl, overviewEl) {
    // Fade out month view
    await anime({
        targets: monthViewEl,
        opacity: [1, 0],
        duration: 350,
        easing: 'easeInCubic',
    }).finished;

    monthViewEl.style.display = 'none';
    overviewEl.style.display = '';

    // Reset month view for when we return
    anime.set(monthViewEl, { opacity: 1, scale: 1 });

    // Animate overview cards in with stagger
    const cards = overviewEl.querySelectorAll('.overview-month-card');
    anime.set(cards, { opacity: 0, translateY: 20 });

    await anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(50),
        duration: 400,
        easing: 'easeOutCubic',
    }).finished;
}

// ===== All months overview → Single month (simple crossfade) =====
export async function transitionFromOverview(overviewEl, monthViewEl) {
    // Fade out overview
    await anime({
        targets: overviewEl,
        opacity: [1, 0],
        duration: 300,
        easing: 'easeInCubic',
    }).finished;

    overviewEl.style.display = 'none';
    anime.set(overviewEl, { opacity: 1 });
    monthViewEl.style.display = '';
}
