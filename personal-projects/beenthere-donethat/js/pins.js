// ========================================
// Pin System - Placement, Clustering, Hover
// ========================================
import { CLUSTER } from './config.js';
import { latLngToSvg, getMapState, getActiveMapConfig } from './map.js';
import { animatePinEntrance, animatePreviewShow, animatePreviewHide, animatePinBounce } from './animations.js';

let pinsContainer = null;
let previewEl = null;
let onPinClick = null;
let hideTimeout = null;

export function setPinsContainer(container) {
    pinsContainer = container;
}

export function initPins(container, clickHandler) {
    pinsContainer = container;
    onPinClick = clickHandler;

    // Create hover preview element
    previewEl = document.createElement('div');
    previewEl.className = 'hover-preview';
    previewEl.innerHTML = `
        <div class="hover-preview-card">
            <img class="hover-preview-img" src="" alt="">
            <div class="hover-preview-info">
                <div class="hover-preview-title"></div>
                <div class="hover-preview-location"></div>
                <div class="hover-preview-date"></div>
                <div class="hover-preview-multi" style="display:none"></div>
            </div>
        </div>
    `;
    document.body.appendChild(previewEl);
}

export function renderPins(trips) {
    if (!pinsContainer) return;
    pinsContainer.innerHTML = '';

    const mapState = getMapState();
    const scale = mapState.scale;

    // Group trips by location (same lat/lng or very close)
    const locationGroups = groupByLocation(trips);

    // Cluster groups if zoomed out
    const clustered = clusterGroups(locationGroups, scale);

    clustered.forEach(item => {
        if (item.isCluster) {
            createClusterPin(item);
        } else {
            createLocationPin(item.groups[0]);
        }
    });

    // Animate entrance
    const pinEls = pinsContainer.querySelectorAll('.pin-group');
    if (pinEls.length > 0) {
        animatePinEntrance(pinEls);
    }
}

// Group trips that are at the same or very close coordinates
function groupByLocation(trips) {
    const groups = [];
    const used = new Set();
    const threshold = 0.5; // degrees - trips within this distance are "same location"

    for (let i = 0; i < trips.length; i++) {
        if (used.has(i)) continue;
        const group = [trips[i]];
        used.add(i);

        for (let j = i + 1; j < trips.length; j++) {
            if (used.has(j)) continue;
            const dLat = Math.abs(trips[i].lat - trips[j].lat);
            const dLng = Math.abs(trips[i].lng - trips[j].lng);
            if (dLat < threshold && dLng < threshold) {
                group.push(trips[j]);
                used.add(j);
            }
        }

        // Sort by date descending
        group.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        groups.push({
            trips: group,
            lat: group[0].lat,
            lng: group[0].lng,
            country: group[0].country,
        });
    }
    return groups;
}

// Cluster location groups that are close on the map
function clusterGroups(groups, zoom) {
    if (zoom >= CLUSTER.zoomThreshold) {
        return groups.map(g => ({ isCluster: false, groups: [g], lat: g.lat, lng: g.lng, country: g.country }));
    }

    const clusters = [];
    const used = new Set();
    const threshold = CLUSTER.minDistance / zoom;

    for (let i = 0; i < groups.length; i++) {
        if (used.has(i)) continue;
        const cluster = [groups[i]];
        used.add(i);
        const svgA = latLngToSvg(groups[i].lat, groups[i].lng, groups[i].country);

        for (let j = i + 1; j < groups.length; j++) {
            if (used.has(j)) continue;
            const svgB = latLngToSvg(groups[j].lat, groups[j].lng, groups[j].country);
            const dist = Math.sqrt((svgA.x - svgB.x) ** 2 + (svgA.y - svgB.y) ** 2);
            if (dist < threshold) {
                cluster.push(groups[j]);
                used.add(j);
            }
        }

        const totalTrips = cluster.reduce((s, g) => s + g.trips.length, 0);
        const avgLat = cluster.reduce((s, g) => s + g.lat, 0) / cluster.length;
        const avgLng = cluster.reduce((s, g) => s + g.lng, 0) / cluster.length;

        clusters.push({
            isCluster: cluster.length > 1 || totalTrips > 3,
            groups: cluster,
            lat: avgLat,
            lng: avgLng,
            country: cluster[0].country,
            totalTrips,
        });
    }
    return clusters;
}

function createLocationPin(locationGroup) {
    const { trips, lat, lng, country } = locationGroup;
    const svgCoord = latLngToSvg(lat, lng, country);
    const mapCfg = getActiveMapConfig();

    const pinGroup = document.createElement('div');
    pinGroup.className = 'pin-group';
    pinGroup.style.left = `${(svgCoord.x / mapCfg.viewBoxWidth) * 100}%`;
    pinGroup.style.top = `${(svgCoord.y / mapCfg.viewBoxHeight) * 100}%`;

    const hasMultiple = trips.length > 1;
    const badgeHtml = hasMultiple
        ? `<div class="pin-badge">${trips.length}</div>`
        : '';

    pinGroup.innerHTML = `
        <div class="pin-anchor">
            <div class="pin-pulse"></div>
            <svg class="pin" viewBox="0 0 24 32" width="24" height="32">
                <path class="pin-marker" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"/>
                <circle class="pin-dot" cx="12" cy="11" r="4"/>
            </svg>
            ${badgeHtml}
        </div>
    `;

    pinGroup.addEventListener('mouseenter', (e) => showPreview(locationGroup, e));
    pinGroup.addEventListener('mouseleave', () => hidePreview());
    pinGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        animatePinBounce(pinGroup.querySelector('.pin'));
        if (onPinClick) onPinClick(locationGroup);
    });

    pinsContainer.appendChild(pinGroup);
}

function createClusterPin(cluster) {
    const svgCoord = latLngToSvg(cluster.lat, cluster.lng, cluster.country);
    const mapCfg = getActiveMapConfig();

    const pinGroup = document.createElement('div');
    pinGroup.className = 'pin-group';
    pinGroup.style.left = `${(svgCoord.x / mapCfg.viewBoxWidth) * 100}%`;
    pinGroup.style.top = `${(svgCoord.y / mapCfg.viewBoxHeight) * 100}%`;

    const total = cluster.groups.reduce((s, g) => s + g.trips.length, 0);

    pinGroup.innerHTML = `
        <div class="cluster-pin">
            <div class="cluster-ring"></div>
            ${total}
        </div>
    `;

    pinGroup.addEventListener('mouseenter', (e) => {
        const allTrips = cluster.groups.flatMap(g => g.trips);
        showPreview({
            trips: allTrips,
            lat: cluster.lat,
            lng: cluster.lng,
        }, e);
    });
    pinGroup.addEventListener('mouseleave', () => hidePreview());
    pinGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onPinClick) onPinClick(null, cluster);
    });

    pinsContainer.appendChild(pinGroup);
}

function showPreview(locationGroup, event) {
    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }

    const trips = locationGroup.trips;
    const first = trips[0];

    const img = previewEl.querySelector('.hover-preview-img');
    const title = previewEl.querySelector('.hover-preview-title');
    const location = previewEl.querySelector('.hover-preview-location');
    const date = previewEl.querySelector('.hover-preview-date');
    const multi = previewEl.querySelector('.hover-preview-multi');

    img.src = first.thumbnail || first.images?.[0] || '';
    img.style.display = img.src ? 'block' : 'none';
    title.textContent = first.title;
    location.textContent = first.location;
    date.textContent = first.startDate ? formatDate(first.startDate) : '';

    // Show multi-trip indicator
    if (trips.length > 1) {
        multi.style.display = 'block';
        multi.innerHTML = `<span style="color:var(--blue);font-weight:600;">+${trips.length - 1}개의 여행 더보기</span>`;
    } else {
        multi.style.display = 'none';
    }

    // Position near the pin
    const rect = event.currentTarget.getBoundingClientRect();
    const previewWidth = 220;
    const previewHeight = img.src ? 220 : 100;

    let left = rect.left + rect.width / 2 - previewWidth / 2;
    let top = rect.top - previewHeight - 12;

    if (left < 8) left = 8;
    if (left + previewWidth > window.innerWidth - 8) left = window.innerWidth - previewWidth - 8;
    if (top < 8) top = rect.bottom + 12;

    previewEl.style.left = `${left}px`;
    previewEl.style.top = `${top}px`;
    previewEl.style.position = 'fixed';

    animatePreviewShow(previewEl);
}

function hidePreview() {
    hideTimeout = setTimeout(() => {
        animatePreviewHide(previewEl);
    }, 100);
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}
