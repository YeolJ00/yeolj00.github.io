// ========================================
// 머문자리 (Meomunjari) - Main App
// ========================================
import { loadTrips, getKrTrips, filterTrips, getCountries, getDateRange, getTripById } from './data.js';
import { initMap, switchMap, getActivePinsContainer, zoomToLocation, resetZoom, zoomIn, zoomOut, onZoomChange, getMapState } from './map.js';
import { initPins, setPinsContainer, renderPins } from './pins.js';
import {
    animateLoadingScreen, hideLoadingScreen,
    animateMapEntrance, animateHeaderEntrance,
} from './animations.js';
import {
    initTripPanel, openTripPanel, closeTripPanel,
    initFilterPanel, toggleFilterPanel,
    initTimeline, updateTimeline, toggleTimeline,
    initLightbox, initToast,
    initTheme,
} from './ui.js';

// App State
let currentFilter = { countries: [], yearRange: null, searchTerm: '' };
let isKoreaMode = false;

async function init() {
    initTheme();
    animateLoadingScreen();

    await loadTrips();

    // Init map
    const mapContainer = document.getElementById('map-container');
    const svg = await initMap(mapContainer);

    // Init pins with world pins container
    initPins(getActivePinsContainer(), handlePinClick);
    renderCurrentPins();

    // Init UI components
    initTripPanel(() => {});
    initLightbox();
    initToast();

    const countries = getCountries();
    const dateRange = getDateRange();
    initFilterPanel(countries, dateRange, handleFilterChange);
    initTimeline(getWorldTrips(), handleTimelineDotClick);

    // Zoom change callback - re-render pins on zoom
    let zoomRenderTimeout = null;
    onZoomChange((newScale) => {
        clearTimeout(zoomRenderTimeout);
        zoomRenderTimeout = setTimeout(() => renderCurrentPins(), 200);

        const zoomLabel = document.querySelector('.zoom-level');
        if (zoomLabel) zoomLabel.textContent = `${Math.round(newScale * 100)}%`;
    });

    setupButtons();

    // Hide loading, show map
    await new Promise(r => setTimeout(r, 800));
    await hideLoadingScreen();
    await animateMapEntrance(svg);
    animateHeaderEntrance();
}

function getWorldTrips() {
    return filterTrips(currentFilter).filter(t => t.country !== 'KR');
}

function getKoreaTrips() {
    return getKrTrips();
}

function renderCurrentPins() {
    const trips = isKoreaMode ? getKoreaTrips() : getWorldTrips();
    renderPins(trips);
}

function handlePinClick(locationGroup, cluster) {
    if (cluster) {
        zoomToLocation(cluster.lat, cluster.lng, getMapState().scale * 2.5, cluster.country);
    } else if (locationGroup) {
        const { trips, lat, lng, country } = locationGroup;
        zoomToLocation(lat, lng, isKoreaMode ? 3 : 5, country).then(() => {
            openTripPanel(trips);
        });
    }
}

function handleFilterChange(filter) {
    currentFilter = filter;
    renderCurrentPins();
    if (!isKoreaMode) {
        updateTimeline(getWorldTrips(), handleTimelineDotClick);
    }
}

function handleTimelineDotClick(tripId) {
    const trip = getTripById(tripId);
    if (trip) {
        zoomToLocation(trip.lat, trip.lng, isKoreaMode ? 3 : 5, trip.country).then(() => {
            openTripPanel(trip);
        });
    }
}

async function toggleKoreaMap() {
    isKoreaMode = !isKoreaMode;
    const btn = document.getElementById('btn-korea');
    const icon = document.getElementById('korea-btn-icon');
    const label = document.getElementById('korea-btn-label');

    if (isKoreaMode) {
        await switchMap('korea');
        btn?.classList.add('active');
        if (icon) icon.src = 'assets/globe-icon.svg';
        if (label) label.textContent = '세계';
        setPinsContainer(getActivePinsContainer());
        renderCurrentPins();
        updateTimeline(getKoreaTrips(), handleTimelineDotClick);

        // Animate the Korea SVG entrance
        const koreaSvg = document.querySelector('.map-wrapper:not([style*="display: none"]) svg');
        if (koreaSvg) animateMapEntrance(koreaSvg);
    } else {
        await switchMap('world');
        btn?.classList.remove('active');
        if (icon) icon.src = 'assets/korea-icon.svg';
        if (label) label.textContent = '한국';
        setPinsContainer(getActivePinsContainer());
        renderCurrentPins();
        updateTimeline(getWorldTrips(), handleTimelineDotClick);
    }
}

function setupButtons() {
    document.getElementById('btn-zoom-in')?.addEventListener('click', zoomIn);
    document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);
    document.getElementById('btn-zoom-reset')?.addEventListener('click', () => resetZoom());

    // Korea map toggle
    document.getElementById('btn-korea')?.addEventListener('click', toggleKoreaMap);

    // Filter toggle
    document.getElementById('btn-filter')?.addEventListener('click', toggleFilterPanel);

    // Timeline toggle
    document.getElementById('btn-timeline')?.addEventListener('click', toggleTimeline);

    // Logo click - reset view
    document.querySelector('.logo')?.addEventListener('click', () => {
        if (isKoreaMode) toggleKoreaMap();
        else resetZoom();
        closeTripPanel();
    });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
