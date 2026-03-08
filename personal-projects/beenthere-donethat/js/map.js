// ========================================
// Map Module - SVG loading, zoom, pan
// ========================================
import { MAP_CONFIG, KOREA_MAP_CONFIG, MAP_COUNTRY_COLORS, MAP_COUNTRY_COLORS_DARK, COUNTRY_GEO, COUNTRY_SVG_NAMES, latLngToSvgFallback } from './config.js';

const anime = window.anime;

// Cache of country SVG bounding boxes { code: { x, y, width, height } }
let countryBBoxCache = {};

// Current map type: 'world' or 'korea'
let currentMapType = 'world';

let mapState = {
    scale: 1,
    translateX: 0,
    translateY: 0,
    minScale: 0.8,
    maxScale: 12,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastTranslate: { x: 0, y: 0 },
    wrapper: null,       // active wrapper
    container: null,
    svgElement: null,    // active SVG
    onZoomChange: null,
    animating: false,
    // Store both wrappers
    worldWrapper: null,
    worldSvg: null,
    koreaWrapper: null,
    koreaSvg: null,
    worldPinsContainer: null,
    koreaPinsContainer: null,
};

export function getMapState() {
    return { ...mapState };
}

export function getCurrentMapType() {
    return currentMapType;
}

export function getActiveMapConfig() {
    return currentMapType === 'korea' ? KOREA_MAP_CONFIG : MAP_CONFIG;
}

export function getActivePinsContainer() {
    return currentMapType === 'korea' ? mapState.koreaPinsContainer : mapState.worldPinsContainer;
}

export async function initMap(container) {
    mapState.container = container;

    // Load world SVG
    const worldWrapper = document.createElement('div');
    worldWrapper.className = 'map-wrapper';
    container.appendChild(worldWrapper);

    const response = await fetch('assets/world.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.querySelector('svg');

    // Clean up SVG attributes
    ['width', 'height', 'baseprofile', 'fill', 'stroke',
     'stroke-linecap', 'stroke-linejoin', 'stroke-width', 'version', 'viewbox'
    ].forEach(attr => svg.removeAttribute(attr));
    svg.setAttribute('viewBox', `0 0 ${MAP_CONFIG.viewBoxWidth} ${MAP_CONFIG.viewBoxHeight}`);
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.display = 'block';

    worldWrapper.style.display = 'inline-block';
    worldWrapper.style.width = '90vw';
    worldWrapper.style.maxWidth = '1400px';
    worldWrapper.style.position = 'relative';

    applyCountryColors(svg);
    worldWrapper.appendChild(svg);

    // Create world pins container
    const worldPins = document.createElement('div');
    worldPins.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    worldWrapper.appendChild(worldPins);

    mapState.worldWrapper = worldWrapper;
    mapState.worldSvg = svg;
    mapState.worldPinsContainer = worldPins;
    mapState.wrapper = worldWrapper;
    mapState.svgElement = svg;

    // Build country bounding box cache from SVG paths
    buildCountryBBoxCache(svg);

    setupPanZoom(container, worldWrapper);
    return svg;
}

export async function loadKoreaMap() {
    if (mapState.koreaWrapper) return; // already loaded

    const container = mapState.container;

    const koreaWrapper = document.createElement('div');
    koreaWrapper.className = 'map-wrapper';
    koreaWrapper.style.display = 'none';
    container.appendChild(koreaWrapper);

    const response = await fetch('assets/kr.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.querySelector('svg');

    ['width', 'height', 'baseprofile', 'fill', 'stroke',
     'stroke-linecap', 'stroke-linejoin', 'stroke-width', 'version', 'viewbox'
    ].forEach(attr => svg.removeAttribute(attr));
    svg.setAttribute('viewBox', `0 0 ${KOREA_MAP_CONFIG.viewBoxWidth} ${KOREA_MAP_CONFIG.viewBoxHeight}`);
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.display = 'block';

    koreaWrapper.style.display = 'none';
    koreaWrapper.style.width = '50vw';
    koreaWrapper.style.maxWidth = '600px';
    koreaWrapper.style.position = 'relative';

    applyCountryColors(svg);
    koreaWrapper.appendChild(svg);

    // Create korea pins container
    const koreaPins = document.createElement('div');
    koreaPins.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    koreaWrapper.appendChild(koreaPins);

    mapState.koreaWrapper = koreaWrapper;
    mapState.koreaSvg = svg;
    mapState.koreaPinsContainer = koreaPins;

}


export async function switchMap(type) {
    if (type === currentMapType) return;

    // Reset zoom first
    mapState.scale = 1;
    mapState.translateX = 0;
    mapState.translateY = 0;

    if (type === 'korea') {
        await loadKoreaMap();
        mapState.worldWrapper.style.display = 'none';
        mapState.koreaWrapper.style.display = 'inline-block';
        mapState.wrapper = mapState.koreaWrapper;
        mapState.svgElement = mapState.koreaSvg;
    } else {
        if (mapState.koreaWrapper) mapState.koreaWrapper.style.display = 'none';
        mapState.worldWrapper.style.display = 'inline-block';
        mapState.wrapper = mapState.worldWrapper;
        mapState.svgElement = mapState.worldSvg;
    }

    currentMapType = type;
    applyTransform();
    if (mapState.onZoomChange) mapState.onZoomChange(mapState.scale);
}

// ===== SVG-anchored coordinate conversion =====
function buildCountryBBoxCache(svg) {
    countryBBoxCache = {};
    const allCountryCodes = Object.keys(COUNTRY_GEO);

    for (const code of allCountryCodes) {
        const svgName = COUNTRY_SVG_NAMES[code];
        let paths = [];

        const byId = svg.querySelector(`#${code}`);
        if (byId) paths.push(byId);

        if (svgName) {
            const byClass = svg.querySelectorAll(`path[class="${svgName}"]`);
            byClass.forEach(p => paths.push(p));
        }

        const byClassCode = svg.querySelectorAll(`path[class="${code}"]`);
        byClassCode.forEach(p => {
            if (!paths.includes(p)) paths.push(p);
        });

        if (paths.length === 0) continue;

        // For countries with multiple paths, filter out distant territories
        // (e.g. Alaska/Hawaii for US) by finding the path closest to the expected
        // geographic center via fallback formula, then keeping only nearby paths.
        if (paths.length > 1) {
            const geo = COUNTRY_GEO[code];
            if (!geo) continue;
            const centerLat = (geo.latMin + geo.latMax) / 2;
            const centerLng = (geo.lngMin + geo.lngMax) / 2;
            const geoCenter = latLngToSvgFallback(centerLat, centerLng);

            let refPath = paths[0];
            let refDist = Infinity;
            for (const path of paths) {
                try {
                    const bbox = path.getBBox();
                    const cx = bbox.x + bbox.width / 2;
                    const cy = bbox.y + bbox.height / 2;
                    const dist = Math.sqrt((cx - geoCenter.x) ** 2 + (cy - geoCenter.y) ** 2);
                    if (dist < refDist) { refDist = dist; refPath = path; }
                } catch (e) {}
            }

            try {
                const refBBox = refPath.getBBox();
                const refCX = refBBox.x + refBBox.width / 2;
                const refCY = refBBox.y + refBBox.height / 2;
                const threshold = Math.max(refBBox.width, refBBox.height) * 1.2;

                paths = paths.filter(p => {
                    try {
                        const bbox = p.getBBox();
                        const cx = bbox.x + bbox.width / 2;
                        const cy = bbox.y + bbox.height / 2;
                        return Math.sqrt((cx - refCX) ** 2 + (cy - refCY) ** 2) < threshold;
                    } catch (e) { return false; }
                });
            } catch (e) {}
        }

        // Compute combined bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const path of paths) {
            try {
                const bbox = path.getBBox();
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            } catch (e) {}
        }

        if (minX !== Infinity) {
            countryBBoxCache[code] = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
    }
}

// Convert lat/lng to SVG coordinates
export function latLngToSvg(lat, lng, countryCode) {
    if (currentMapType === 'korea') {
        return latLngToKoreaSvg(lat, lng);
    }

    if (countryCode && countryBBoxCache[countryCode] && COUNTRY_GEO[countryCode]) {
        const svgBBox = countryBBoxCache[countryCode];
        const geo = COUNTRY_GEO[countryCode];

        const xFrac = (lng - geo.lngMin) / (geo.lngMax - geo.lngMin);
        const yFrac = (geo.latMax - lat) / (geo.latMax - geo.latMin);

        return {
            x: svgBBox.x + xFrac * svgBBox.width,
            y: svgBBox.y + yFrac * svgBBox.height,
        };
    }

    return latLngToSvgFallback(lat, lng);
}

function latLngToKoreaSvg(lat, lng) {
    // Use pre-calibrated linear mapping from SVG reference points
    const c = KOREA_MAP_CONFIG.calib;
    return {
        x: c.xRef + (lng - c.lngRef) * c.xScale,
        y: c.yRef + (lat - c.latRef) * c.yScale,
    };
}

// ===== Country Colors =====
function applyCountryColors(svg) {
    const paths = svg.querySelectorAll('path');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colors = isDark ? MAP_COUNTRY_COLORS_DARK : MAP_COUNTRY_COLORS;

    paths.forEach((path, i) => {
        const colorIndex = hashString(path.getAttribute('id') || path.getAttribute('class') || String(i)) % colors.length;
        path.setAttribute('fill', colors[colorIndex]);
    });
}

export function updateMapColors() {
    if (mapState.worldSvg) applyCountryColors(mapState.worldSvg);
    if (mapState.koreaSvg) applyCountryColors(mapState.koreaSvg);
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

// ===== Pan/Zoom =====
function setupPanZoom(container, wrapper) {
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        zoomAt(delta, mouseX, mouseY);
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        mapState.isDragging = true;
        mapState.dragStart = { x: e.clientX, y: e.clientY };
        mapState.lastTranslate = { x: mapState.translateX, y: mapState.translateY };
        container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!mapState.isDragging) return;
        mapState.translateX = mapState.lastTranslate.x + (e.clientX - mapState.dragStart.x);
        mapState.translateY = mapState.lastTranslate.y + (e.clientY - mapState.dragStart.y);
        applyTransform();
    });

    window.addEventListener('mouseup', () => {
        if (mapState.isDragging) {
            mapState.isDragging = false;
            container.style.cursor = 'grab';
        }
    });

    // Touch support
    let lastTouchDist = null;

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            mapState.isDragging = true;
            mapState.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            mapState.lastTranslate = { x: mapState.translateX, y: mapState.translateY };
        } else if (e.touches.length === 2) {
            mapState.isDragging = false;
            lastTouchDist = getTouchDist(e.touches);
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && mapState.isDragging) {
            mapState.translateX = mapState.lastTranslate.x + (e.touches[0].clientX - mapState.dragStart.x);
            mapState.translateY = mapState.lastTranslate.y + (e.touches[0].clientY - mapState.dragStart.y);
            applyTransform();
        } else if (e.touches.length === 2 && lastTouchDist) {
            const dist = getTouchDist(e.touches);
            const delta = (dist - lastTouchDist) * 0.005;
            const center = getTouchCenter(e.touches);
            const rect = container.getBoundingClientRect();
            zoomAt(delta, center.x - rect.left - rect.width / 2, center.y - rect.top - rect.height / 2);
            lastTouchDist = dist;
        }
    }, { passive: false });

    container.addEventListener('touchend', () => {
        mapState.isDragging = false;
        lastTouchDist = null;
    }, { passive: true });
}

function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches) {
    return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
    };
}

function zoomAt(delta, mouseX, mouseY) {
    const oldScale = mapState.scale;
    const newScale = Math.max(mapState.minScale, Math.min(mapState.maxScale, oldScale * (1 + delta)));
    if (newScale === oldScale) return;

    const scaleRatio = newScale / oldScale;
    mapState.translateX = mouseX - (mouseX - mapState.translateX) * scaleRatio;
    mapState.translateY = mouseY - (mouseY - mapState.translateY) * scaleRatio;
    mapState.scale = newScale;
    applyTransform();

    if (mapState.onZoomChange) mapState.onZoomChange(newScale);
}

function applyTransform() {
    // Apply transform to the ACTIVE wrapper
    if (!mapState.wrapper) return;
    mapState.wrapper.style.transform =
        `translate(${mapState.translateX}px, ${mapState.translateY}px) scale(${mapState.scale})`;
}

// ===== Smooth Zoom =====
export function smoothZoomTo(scale, tx, ty, duration = 800) {
    if (mapState.animating) return Promise.resolve();
    mapState.animating = true;

    return anime({
        targets: mapState,
        scale: [mapState.scale, scale],
        translateX: [mapState.translateX, tx],
        translateY: [mapState.translateY, ty],
        duration,
        easing: 'easeInOutCubic',
        update: () => applyTransform(),
        complete: () => {
            mapState.animating = false;
            if (mapState.onZoomChange) mapState.onZoomChange(scale);
        },
    }).finished;
}

// Zoom to a specific lat/lng (with country code for accuracy)
export function zoomToLocation(lat, lng, targetScale = 5, countryCode) {
    const svgCoord = latLngToSvg(lat, lng, countryCode);
    const wrapper = mapState.wrapper;
    if (!wrapper) return Promise.resolve();

    const cfg = getActiveMapConfig();
    const wrapperRect = wrapper.getBoundingClientRect();
    const baseWidth = wrapperRect.width / mapState.scale;
    const baseHeight = wrapperRect.height / mapState.scale;
    const containerRect = mapState.container.getBoundingClientRect();

    const pointX = (svgCoord.x / cfg.viewBoxWidth) * baseWidth;
    const pointY = (svgCoord.y / cfg.viewBoxHeight) * baseHeight;

    const tx = containerRect.width / 2 - pointX * targetScale;
    const ty = containerRect.height / 2 - pointY * targetScale;

    return smoothZoomTo(targetScale, tx, ty);
}

export function resetZoom() {
    return smoothZoomTo(1, 0, 0);
}

export function zoomIn() {
    zoomAt(0.3, 0, 0);
}

export function zoomOut() {
    zoomAt(-0.3, 0, 0);
}

export function onZoomChange(callback) {
    mapState.onZoomChange = callback;
}

// Highlight a country
export function highlightCountry(countryId) {
    if (!mapState.svgElement) return;
    const svgName = COUNTRY_SVG_NAMES[countryId];
    const path = mapState.svgElement.querySelector(`#${countryId}`) ||
                 (svgName && mapState.svgElement.querySelector(`path[class="${svgName}"]`));
    if (path) {
        anime({ targets: path, fill: '#A8D1E0', duration: 300, easing: 'easeOutQuad' });
    }
}

export function unhighlightCountry(countryId) {
    if (!mapState.svgElement) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colors = isDark ? MAP_COUNTRY_COLORS_DARK : MAP_COUNTRY_COLORS;
    const svgName = COUNTRY_SVG_NAMES[countryId];
    const path = mapState.svgElement.querySelector(`#${countryId}`) ||
                 (svgName && mapState.svgElement.querySelector(`path[class="${svgName}"]`));
    if (path) {
        const idx = hashString(countryId) % colors.length;
        anime({ targets: path, fill: colors[idx], duration: 500, easing: 'easeOutQuad' });
    }
}
