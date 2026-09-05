const form = document.getElementById('streamForm');
const status = document.getElementById('status');
const processBtn = document.getElementById('processBtn');
const btnText = document.getElementById('btnText');

form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const url1 = document.getElementById('url1').value.trim();
    const url2 = document.getElementById('url2').value.trim();

    if (!url1 || !url2) {
        showStatus('Please enter both stream URLs', 'error');
        return;
    }

    setBusy(true);
    showStatus('Analyzing streams...', 'info');

    try {
        // Detect stream types
        const videoUrl = await detectStreamType(url1, url2);
        const audioUrl = videoUrl === url1 ? url2 : url1;

        showStatus('Creating combined playlist...', 'info');
        createAndDownload(videoUrl, audioUrl);
    } catch (error) {
        console.error('Error:', error);
        showStatus('❌ Error processing streams: ' + error.message, 'error');
    } finally {
        setBusy(false);
    }
});

function setBusy(busy) {
    processBtn.disabled = busy;
    btnText.innerHTML = busy
        ? '<span class="spinner"></span>Processing...'
        : '🚀 Create Stream';
}

function createAndDownload(videoUrl, audioUrl) {
    const playlist = createCombinedM3U8(videoUrl, audioUrl);
    downloadPlaylist(playlist, 'Stream playlist created successfully!');
}

function createMasterDownload(masterUrl) {
    // A master playlist already combines audio + video; wrap it in a tiny
    // playlist file that VLC can open directly.
    const playlist = '#EXTM3U\n' + masterUrl + '\n';
    downloadPlaylist(playlist, 'Captured a master playlist (audio + video already combined). Open it with VLC!');
}

function downloadPlaylist(playlist, message) {
    // Create download
    const blob = new Blob([playlist], { type: 'application/vnd.apple.mpegurl' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'coupang_stream.m3u8';
    downloadLink.className = 'download-link';
    downloadLink.textContent = 'Download Stream Playlist';

    showSuccessWithDownload(message, downloadLink);

    // Auto-trigger download on mobile/desktop
    setTimeout(() => downloadLink.click(), isMobile() ? 1000 : 500);
}

function showSuccessWithDownload(message, downloadLink) {
    // First show the success message
    showStatus(message, 'success');

    // Create success container for the download button
    const successContainer = document.createElement('div');
    successContainer.className = 'success-container';
    successContainer.appendChild(downloadLink);

    // Insert after status with a slight delay for better UX
    setTimeout(() => {
        status.parentNode.insertBefore(successContainer, status.nextSibling);
    }, 300);
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type} show`;

    // Clear any existing download containers (not just links in status)
    const existingContainers = document.querySelectorAll('.success-container');
    existingContainers.forEach(container => container.remove());

    // Clear any existing download links in status
    const existingLinks = status.querySelectorAll('.download-link');
    existingLinks.forEach(link => link.remove());
}

async function detectStreamType(url1, url2) {
    try {
        showStatus('Fetching and analyzing manifests...', 'info');

        // Fetch both manifests
        const [type1, type2] = await Promise.all([
            analyzeStreamType(url1),
            analyzeStreamType(url2)
        ]);

        console.log(`Stream 1: ${type1}`);
        console.log(`Stream 2: ${type2}`);

        if (type1 === "video" && type2 === "audio") {
            return url1; // First URL is video
        } else if (type1 === "audio" && type2 === "video") {
            return url2; // Second URL is video
        } else {
            console.log("Could not determine stream types, using first as video");
            showStatus('Could not auto-detect stream types, assuming first URL is video', 'warning');
            return url1;
        }
    } catch (error) {
        console.error('Error detecting stream types:', error);
        showStatus('Error analyzing streams, assuming first URL is video', 'warning');
        return url1;
    }
}

async function analyzeStreamType(manifestUrl) {
    try {
        const response = await fetch(manifestUrl);

        if (!response.ok) {
            console.error(`Failed to fetch manifest: ${response.status}`);
            return "unknown";
        }

        const manifest = await response.text();
        const manifestLower = manifest.toLowerCase();

        // A master playlist references variant streams (usually both audio & video)
        if (manifestLower.includes('#ext-x-stream-inf')) {
            return "master";
        }

        // Check for audio/video-specific indicators
        const audioScore = manifestLower.includes('audio') ? 1 : 0;
        const videoScore = manifestLower.includes('video') ? 1 : 0;

        if (audioScore > videoScore) {
            return "audio";
        } else if (videoScore > audioScore) {
            return "video";
        } else {
            return "unknown";
        }

    } catch (error) {
        console.error(`Error fetching manifest: ${error}`);
        return "unknown";
    }
}

function createCombinedM3U8(videoUrl, audioUrl) {
    return `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Korean",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="ko",URI="${audioUrl}"
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1280x720,AUDIO="audio"
${videoUrl}
`;
}

function clearForm() {
    document.getElementById('url1').value = '';
    document.getElementById('url2').value = '';
    status.className = 'status';
    status.textContent = '';

    // Also clear success containers
    const existingContainers = document.querySelectorAll('.success-container');
    existingContainers.forEach(container => container.remove());
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ---------------------------------------------------------------------------
// Here We Go bookmarklet: a tiny loader that runs ON the coupangplay.com tab
// and injects agent.js (the real logic lives there, not here). It harvests
// every .m3u8 URL the page requests and jumps back here as ?streams=a|b|c
// when it can't fully auto-detect a stream.
//
// Why a loader and not the whole agent inlined: mobile Chrome's "edit
// bookmark" URL field silently truncates very long pasted text, so a
// multi-KB inline bookmarklet can end up saved-but-broken on phones even
// though the same code works fine dragged onto a desktop bookmarks bar. A
// short loader avoids that, and lets agent.js be updated without users
// having to re-save their bookmark.
// ---------------------------------------------------------------------------

const CANONICAL_SITE = 'https://yeolj00.github.io/personal-projects/live-here-we-go/';

function siteUrl() {
    const h = window.location.hostname;
    if (!h || h === 'localhost' || h === '127.0.0.1' || window.location.protocol === 'file:') {
        return CANONICAL_SITE;
    }
    return window.location.origin + window.location.pathname;
}

// Where agent.js itself should be fetched from. Deliberately NOT collapsed
// to CANONICAL_SITE on localhost like siteUrl() is: during local testing
// (and local dev) the loader should fetch the local copy of agent.js, not
// reach out to the real production site.
function agentBaseUrl() {
    if (window.location.protocol === 'file:') return CANONICAL_SITE;
    return window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
}

function buildBookmarklet() {
    const target = siteUrl();
    const agentUrl = agentBaseUrl() + 'agent.js';
    const loader = 'var s=document.createElement("script");' +
        's.src=' + JSON.stringify(agentUrl) + '+"?site=" + encodeURIComponent(' + JSON.stringify(target) + ') + "&t=" + Date.now();' +
        'document.body.appendChild(s);';
    return 'javascript:(function(){' + loader + '})();';
}

function initBookmarklet() {
    const bookmarklet = buildBookmarklet();
    const codeBox = document.getElementById('bookmarkletCode');
    const link = document.getElementById('bookmarkletLink');
    const copyBtn = document.getElementById('copyBookmarklet');

    if (codeBox) codeBox.textContent = bookmarklet;
    if (link) {
        link.setAttribute('href', bookmarklet);
        // Prevent it from running on THIS page when clicked (dragging to the
        // bookmarks bar still works)
        link.addEventListener('click', e => e.preventDefault());
    }
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(bookmarklet);
                copyBtn.textContent = '✅ Copied!';
            } catch (e) {
                // Clipboard API unavailable; select the text for manual copy
                const range = document.createRange();
                range.selectNodeContents(codeBox);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                copyBtn.textContent = 'Press Ctrl+C to copy';
            }
            setTimeout(() => { copyBtn.textContent = '📋 Copy code'; }, 2000);
        });
    }
}

// ---------------------------------------------------------------------------
// Auto-processing of incoming stream URLs (?streams=a|b|c or ?url1=&url2=)
// ---------------------------------------------------------------------------

async function handleIncomingStreams() {
    const params = new URLSearchParams(window.location.search);

    let urls = [];
    const streams = params.get('streams');
    if (streams) {
        urls = streams.split('|').map(s => s.trim()).filter(Boolean);
    }
    if (params.get('url1') && params.get('url2')) {
        urls = [params.get('url1'), params.get('url2')];
    }
    urls = [...new Set(urls)];
    if (urls.length === 0) return;

    // Incoming captured streams belong to the manual Merge tool; show it.
    showTab('merge');

    // Clean the address bar so a refresh doesn't re-trigger with expired URLs
    history.replaceState(null, '', window.location.pathname);

    setBusy(true);
    showStatus(`📡 Analyzing ${urls.length} captured stream URL(s)...`, 'info');

    try {
        const types = await Promise.all(urls.map(analyzeStreamType));

        // Prefer the most recently requested URL of each kind
        let videoUrl = null, audioUrl = null;
        for (let i = urls.length - 1; i >= 0; i--) {
            if (!videoUrl && types[i] === 'video') videoUrl = urls[i];
            if (!audioUrl && types[i] === 'audio') audioUrl = urls[i];
        }

        if (videoUrl && audioUrl) {
            document.getElementById('url1').value = videoUrl;
            document.getElementById('url2').value = audioUrl;
            createAndDownload(videoUrl, audioUrl);
            return;
        }

        // Couldn't find a clean video+audio pair
        let masterUrl = null;
        for (let i = urls.length - 1; i >= 0; i--) {
            if (types[i] === 'master') { masterUrl = urls[i]; break; }
        }
        const candidates = urls.filter((u, i) => types[i] !== 'master');

        if (candidates.length >= 2 || (videoUrl || audioUrl)) {
            document.getElementById('url1').value = videoUrl || candidates[0] || '';
            document.getElementById('url2').value = audioUrl || candidates[1] || candidates[0] || '';
            showStatus('⚠️ Could not fully auto-detect audio/video. Captured URLs are filled in. Check them and press Create Stream.', 'warning');
        } else if (masterUrl) {
            // A master playlist already references both audio and video;
            // it can be opened directly in VLC, no merging needed.
            document.getElementById('url1').value = masterUrl;
            createMasterDownload(masterUrl);
        } else {
            showStatus('❌ Not enough stream URLs were captured. Let the stream play ~10 seconds, then run Here We Go again.', 'error');
        }
    } catch (error) {
        console.error('Error auto-processing streams:', error);
        showStatus('❌ Error processing captured streams: ' + error.message, 'error');
    } finally {
        setBusy(false);
    }
}

// ---------------------------------------------------------------------------
// Tab navigation (Grab / Merge / How it works)
// ---------------------------------------------------------------------------

const TAB_IDS = ['grab', 'merge', 'how'];

function showTab(name) {
    if (TAB_IDS.indexOf(name) === -1) name = 'grab';
    TAB_IDS.forEach(id => {
        const tab = document.getElementById('tab-' + id);
        const panel = document.getElementById('panel-' + id);
        if (!tab || !panel) return;
        const active = id === name;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        panel.hidden = !active;
    });
}

function initTabs() {
    const tabs = Array.from(document.querySelectorAll('.tab'));

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const name = tab.dataset.tab;
            showTab(name);
            history.replaceState(null, '', '#' + name);
        });
    });

    // Arrow-key navigation across the tablist
    const tablist = document.querySelector('.tabs');
    if (tablist) {
        tablist.addEventListener('keydown', e => {
            const i = tabs.indexOf(document.activeElement);
            if (i === -1) return;
            let next = -1;
            if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
            else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = tabs.length - 1;
            if (next !== -1) {
                e.preventDefault();
                tabs[next].focus();
                tabs[next].click();
            }
        });
    }

    // In-page links that jump to a tab (e.g. "Why a bookmark?")
    document.querySelectorAll('a[data-tab]').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const name = a.dataset.tab;
            showTab(name);
            history.replaceState(null, '', '#' + name);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Open the tab named in the URL hash (#grab / #merge / #how)
    const hash = window.location.hash.replace('#', '');
    if (TAB_IDS.indexOf(hash) !== -1) showTab(hash);

    // Respond to back/forward and manual hash edits
    window.addEventListener('hashchange', () => {
        const h = window.location.hash.replace('#', '');
        if (TAB_IDS.indexOf(h) !== -1) showTab(h);
    });
}

initTabs();
initBookmarklet();
handleIncomingStreams();
