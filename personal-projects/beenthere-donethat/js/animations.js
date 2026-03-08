// ========================================
// Anime.js Animation Utilities
// ========================================
import { ANIM } from './config.js';

// Ensure anime is available globally (loaded via CDN)
const anime = window.anime;

// ===== Loading Screen Animations =====
export function animateLoadingScreen() {
    const tl = anime.timeline({ easing: 'easeOutExpo' });

    tl.add({
        targets: '.loading-title',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 800,
    })
    .add({
        targets: '.loading-subtitle',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
    }, '-=400')
    .add({
        targets: '.loading-dot',
        opacity: [0, 1],
        scale: [0, 1],
        delay: anime.stagger(150),
        duration: 400,
    }, '-=300');

    // Pulsing dots
    anime({
        targets: '.loading-dot',
        scale: [1, 1.3, 1],
        opacity: [1, 0.5, 1],
        delay: anime.stagger(200),
        duration: 1000,
        loop: true,
        easing: 'easeInOutSine',
    });

    return tl;
}

export function hideLoadingScreen() {
    return anime({
        targets: '.loading-screen',
        opacity: [1, 0],
        duration: 600,
        easing: 'easeInOutQuad',
        complete: () => {
            document.querySelector('.loading-screen')?.classList.add('hidden');
        }
    }).finished;
}

// ===== Map Entrance Animation =====
export function animateMapEntrance(svgElement) {
    const paths = svgElement.querySelectorAll('path');

    // Set initial state
    anime.set(paths, { opacity: 0, scale: 0.97, transformOrigin: 'center center' });

    return anime({
        targets: paths,
        opacity: [0, 1],
        scale: [0.97, 1],
        delay: anime.stagger(ANIM.stagger, { from: 'center', grid: [20, 10] }),
        duration: ANIM.entrance,
        easing: 'easeOutCubic',
    }).finished;
}

// ===== Header Entrance =====
export function animateHeaderEntrance() {
    const tl = anime.timeline({ easing: 'easeOutExpo' });

    tl.add({
        targets: '.logo',
        opacity: [0, 1],
        translateY: [-20, 0],
        duration: 700,
    })
    .add({
        targets: '.header-controls',
        opacity: [0, 1],
        translateY: [-20, 0],
        duration: 700,
    }, '-=500')
    .add({
        targets: '.zoom-controls',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 700,
    }, '-=500');

    return tl;
}

// ===== Map Zoom Animation =====
export function animateMapZoom(target, toScale, toX, toY, duration = ANIM.mapZoom) {
    return anime({
        targets: target,
        scale: toScale,
        translateX: toX,
        translateY: toY,
        duration: duration,
        easing: 'easeInOutCubic',
    }).finished;
}

// ===== Smooth Transform (for pan/zoom) =====
export function smoothTransform(element, transform, duration = ANIM.mapZoom) {
    return anime({
        targets: element,
        ...transform,
        duration,
        easing: 'easeOutCubic',
    }).finished;
}

// ===== Pin Animations =====
export function animatePinEntrance(pinElements) {
    anime.set(pinElements, { opacity: 0, scale: 0, translateY: -20 });
    // Disable pointer-events while animating so invisible pins don't eat map drag events
    Array.from(pinElements).forEach(el => { el.style.pointerEvents = 'none'; });

    return anime({
        targets: pinElements,
        opacity: [0, 1],
        scale: [0, 1],
        translateY: [-20, 0],
        delay: anime.stagger(80),
        duration: ANIM.pinBounce,
        easing: 'spring(1, 80, 10, 0)',
        complete: () => {
            Array.from(pinElements).forEach(el => { el.style.pointerEvents = ''; });
        },
    }).finished;
}

export function animatePinBounce(pinElement) {
    return anime({
        targets: pinElement,
        scale: [1, 1.25, 1],
        duration: 400,
        easing: 'easeOutBounce',
    }).finished;
}

export function animatePinPop(pinElement) {
    return anime({
        targets: pinElement,
        scale: [1, 1.3, 1],
        duration: 300,
        easing: 'easeInOutQuad',
    }).finished;
}

// ===== Cluster Animations =====
export function animateClusterExpand(clusterEl, pinElements) {
    const tl = anime.timeline({ easing: 'easeOutExpo' });

    tl.add({
        targets: clusterEl,
        scale: [1, 0],
        opacity: [1, 0],
        duration: 300,
    })
    .add({
        targets: pinElements,
        opacity: [0, 1],
        scale: [0, 1],
        delay: anime.stagger(60),
        duration: 400,
        easing: 'spring(1, 80, 10, 0)',
    }, '-=100');

    return tl;
}

export function animateClusterCollapse(pinElements, clusterEl) {
    const tl = anime.timeline({ easing: 'easeInExpo' });

    tl.add({
        targets: pinElements,
        opacity: [1, 0],
        scale: [1, 0],
        delay: anime.stagger(30),
        duration: 200,
    })
    .add({
        targets: clusterEl,
        scale: [0, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'spring(1, 80, 10, 0)',
    }, '-=100');

    return tl;
}

// ===== Panel Slide Animation =====
export function animatePanelOpen(panelEl, overlayEl) {
    anime({
        targets: overlayEl,
        opacity: [0, 1],
        duration: ANIM.panelSlide,
        easing: 'easeOutQuad',
        begin: () => overlayEl.classList.add('visible'),
    });

    return anime({
        targets: panelEl,
        translateX: ['100%', '0%'],
        duration: ANIM.panelSlide,
        easing: 'easeOutCubic',
    }).finished;
}

export function animatePanelClose(panelEl, overlayEl) {
    anime({
        targets: overlayEl,
        opacity: [1, 0],
        duration: ANIM.panelSlide,
        easing: 'easeInQuad',
        complete: () => overlayEl.classList.remove('visible'),
    });

    return anime({
        targets: panelEl,
        translateX: ['0%', '100%'],
        duration: ANIM.panelSlide,
        easing: 'easeInCubic',
    }).finished;
}

// ===== Filter Panel Animation =====
export function animateFilterOpen(panelEl) {
    return anime({
        targets: panelEl,
        translateX: ['-100%', '0%'],
        duration: ANIM.panelSlide,
        easing: 'easeOutCubic',
    }).finished;
}

export function animateFilterClose(panelEl) {
    return anime({
        targets: panelEl,
        translateX: ['0%', '-100%'],
        duration: ANIM.panelSlide,
        easing: 'easeInCubic',
    }).finished;
}

// ===== Hover Preview =====
export function animatePreviewShow(previewEl) {
    return anime({
        targets: previewEl,
        opacity: [0, 1],
        translateY: [8, 0],
        scale: [0.95, 1],
        duration: 250,
        easing: 'easeOutCubic',
    }).finished;
}

export function animatePreviewHide(previewEl) {
    return anime({
        targets: previewEl,
        opacity: [1, 0],
        translateY: [0, 8],
        scale: [1, 0.95],
        duration: 200,
        easing: 'easeInCubic',
    }).finished;
}

// ===== Timeline Bar =====
export function animateTimelineShow(barEl) {
    return anime({
        targets: barEl,
        translateY: ['100%', '0%'],
        duration: ANIM.panelSlide,
        easing: 'easeOutCubic',
    }).finished;
}

export function animateTimelineHide(barEl) {
    return anime({
        targets: barEl,
        translateY: ['0%', '100%'],
        duration: ANIM.panelSlide,
        easing: 'easeInCubic',
    }).finished;
}

// ===== Lightbox =====
export function animateLightboxOpen(lightboxEl) {
    lightboxEl.classList.add('visible');
    return anime({
        targets: lightboxEl.querySelector('img'),
        scale: [0.85, 1],
        duration: 400,
        easing: 'easeOutCubic',
    }).finished;
}

export function animateLightboxClose(lightboxEl) {
    return anime({
        targets: lightboxEl,
        opacity: [1, 0],
        duration: 300,
        easing: 'easeInQuad',
        complete: () => {
            lightboxEl.classList.remove('visible');
            lightboxEl.style.opacity = '';
        }
    }).finished;
}

// ===== Toast Notification =====
export function animateToastIn(toastEl) {
    return anime({
        targets: toastEl,
        opacity: [0, 1],
        translateX: [20, 0],
        duration: 400,
        easing: 'easeOutCubic',
    }).finished;
}

export function animateToastOut(toastEl) {
    return anime({
        targets: toastEl,
        opacity: [1, 0],
        translateX: [0, 20],
        duration: 300,
        easing: 'easeInCubic',
    }).finished;
}

// ===== Country Highlight Animation =====
export function animateCountryHighlight(pathEl) {
    const originalFill = pathEl.getAttribute('fill');
    return anime({
        targets: pathEl,
        fill: ['#A8D1E0', originalFill],
        duration: 1500,
        easing: 'easeOutQuad',
    }).finished;
}

// ===== Generic Fade In =====
export function fadeIn(targets, duration = ANIM.normal) {
    return anime({
        targets,
        opacity: [0, 1],
        duration,
        easing: 'easeOutQuad',
    }).finished;
}

// ===== Generic Fade Out =====
export function fadeOut(targets, duration = ANIM.normal) {
    return anime({
        targets,
        opacity: [1, 0],
        duration,
        easing: 'easeInQuad',
    }).finished;
}

// ===== Stagger Fade In =====
export function staggerFadeIn(targets, staggerDelay = 50) {
    return anime({
        targets,
        opacity: [0, 1],
        translateY: [15, 0],
        delay: anime.stagger(staggerDelay),
        duration: 500,
        easing: 'easeOutCubic',
    }).finished;
}
