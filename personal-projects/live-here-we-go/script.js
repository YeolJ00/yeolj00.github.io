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
// RocketGrab bookmarklet: runs ON the coupangplay.com tab, harvests every
// .m3u8 URL the page has requested (via the Resource Timing API), and jumps
// back here with them as ?streams=url|url|...
// ---------------------------------------------------------------------------

/*
 * The RocketGrab in-page agent. This function's SOURCE CODE is serialized
 * into the bookmarklet (via toString), so it must be fully self-contained:
 * no comments inside, no template literals, explicit semicolons everywhere
 * (its whitespace gets collapsed onto one line).
 */
function rocketGrabAgent(SITE) {
    var W = window;
    if (W.__rocketGrab) { W.__rocketGrab.rescan(); return; }

    var seen = {};
    var order = [];
    var types = {};
    var texts = {};
    var done = {};
    var dashSeen = false;
    var pickerFor = null;
    var firstSeen = 0;
    var lastPlaylist = null;
    var ui, statusEl, btnRow, obs, fallbackTimer, checkTimer;

    function el(tag, css, txt) {
        var e = document.createElement(tag);
        e.style.cssText = css;
        if (txt) { e.textContent = txt; }
        return e;
    }

    function makeUI() {
        ui = el('div', 'position:fixed;z-index:2147483647;left:12px;right:12px;bottom:12px;max-width:460px;margin:0 auto;background:#1a202c;color:#fff;font:14px/1.45 -apple-system,Roboto,sans-serif;border-radius:12px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,0.45);');
        ui.id = 'rocketgrab';
        var top = el('div', 'display:flex;align-items:center;gap:10px;');
        statusEl = el('div', 'flex:1;');
        var x = el('div', 'cursor:pointer;opacity:0.7;padding:2px 6px;font-size:16px;', '✕');
        x.onclick = function (ev) { ev.stopPropagation(); stop(); };
        top.appendChild(el('div', 'font-size:20px;', '⚡'));
        top.appendChild(statusEl);
        top.appendChild(x);
        btnRow = el('div', 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;');
        ui.appendChild(top);
        ui.appendChild(btnRow);
        document.body.appendChild(ui);
    }

    function say(t, bg) {
        statusEl.textContent = t;
        ui.style.background = bg || '#1a202c';
    }

    function clearButtons() { btnRow.innerHTML = ''; }

    function addButton(label, onClick) {
        var b = el('button', 'flex:0 0 auto;padding:9px 14px;border:none;border-radius:8px;background:#3b82f6;color:#fff;font-weight:600;font-size:14px;cursor:pointer;', label);
        b.onclick = function (ev) { ev.stopPropagation(); onClick(); };
        btnRow.appendChild(b);
        return b;
    }

    function stop() {
        if (obs) { obs.disconnect(); }
        if (ui) { ui.remove(); }
        W.__rocketGrab = null;
    }

    function keyOf(u) { return u.split('?')[0]; }

    function isM3u8(u) { return (/\.m3u8($|\?)/i).test(u); }

    function isMpd(u) { return (/\.mpd($|\?)/i).test(u); }

    function guess(u) {
        var s = keyOf(u).toLowerCase();
        if (s.indexOf('audio') > -1) { return 'audio'; }
        if (s.indexOf('video') > -1) { return 'video'; }
        return 'unknown';
    }

    function classify(u) {
        return fetch(u).then(function (r) {
            return r.ok ? r.text() : '';
        }).then(function (txt) {
            texts[u] = txt;
            var t = txt.toLowerCase();
            if (/#ext-x-key|sample-aes/i.test(t)) { types[u] = 'drm'; }
            else if (t.indexOf('#ext-x-stream-inf') > -1) { types[u] = 'master'; }
            else {
                var a = t.indexOf('audio') > -1;
                var v = t.indexOf('video') > -1;
                types[u] = (a && !v) ? 'audio' : ((v && !a) ? 'video' : guess(u));
            }
        }).catch(function () { types[u] = guess(u); });
    }

    function latest(kind) {
        var f = null, i;
        for (i = 0; i < order.length; i++) {
            if (types[order[i]] === kind) { f = order[i]; }
        }
        return f;
    }

    function hasDownloaded() {
        var k;
        for (k in done) { if (done[k]) { return true; } }
        return false;
    }

    function abs(uri, base) {
        try { return new URL(uri, base).href; } catch (e) { return uri; }
    }

    function attr(line, name) {
        var m = line.match(new RegExp(name + '="([^"]*)"'));
        if (m) { return m[1]; }
        m = line.match(new RegExp(name + '=([^,]*)'));
        return m ? m[1] : '';
    }

    function parseMaster(url, text) {
        var lines = text.split('\n');
        var variants = [], audios = [], i, line, j, vuri, res, h;
        for (i = 0; i < lines.length; i++) {
            line = lines[i].trim();
            if (line.indexOf('#EXT-X-MEDIA:') === 0 && line.indexOf('TYPE=AUDIO') > -1) {
                var auri = attr(line, 'URI');
                if (auri) {
                    audios.push({
                        url: abs(auri, url),
                        lang: attr(line, 'LANGUAGE'),
                        isDefault: /DEFAULT=YES/i.test(line)
                    });
                }
            } else if (line.indexOf('#EXT-X-STREAM-INF:') === 0) {
                res = attr(line, 'RESOLUTION');
                h = res ? parseInt(res.split('x')[1], 10) : 0;
                j = i + 1;
                while (j < lines.length && (!lines[j].trim() || lines[j].trim().indexOf('#') === 0)) { j++; }
                vuri = lines[j] ? lines[j].trim() : '';
                if (vuri) {
                    variants.push({
                        url: abs(vuri, url),
                        resolution: res || '',
                        height: h,
                        bandwidth: attr(line, 'BANDWIDTH') || '2000000',
                        codecs: attr(line, 'CODECS')
                    });
                }
            }
        }
        var audio = null, k;
        for (k = 0; k < audios.length; k++) { if (audios[k].lang === 'ko') { audio = audios[k]; break; } }
        if (!audio) { for (k = 0; k < audios.length; k++) { if (audios[k].isDefault) { audio = audios[k]; break; } } }
        if (!audio && audios.length) { audio = audios[0]; }
        return { variants: variants, audio: audio };
    }

    function labelFor(v) {
        if (v.height >= 2160) { return '4K'; }
        if (v.height > 0) { return v.height + 'p'; }
        return Math.round(parseInt(v.bandwidth, 10) / 1000) + 'k';
    }

    function buildFromVariant(v, audio) {
        var out = '#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-INDEPENDENT-SEGMENTS\n';
        var audioAttr = '';
        if (audio) {
            out += '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Korean",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="' + (audio.lang || 'ko') + '",URI="' + audio.url + '"\n';
            audioAttr = ',AUDIO="audio"';
        }
        var codecs = v.codecs ? (',CODECS="' + v.codecs + '"') : '';
        var res = v.resolution ? (',RESOLUTION=' + v.resolution) : '';
        out += '#EXT-X-STREAM-INF:BANDWIDTH=' + v.bandwidth + res + codecs + audioAttr + '\n' + v.url + '\n';
        return out;
    }

    function showPicker(masterUrl) {
        var parsed = parseMaster(masterUrl, texts[masterUrl] || '');
        if (!parsed.variants.length) { return false; }
        pickerFor = masterUrl;
        var byHeight = {}, uniq = [], v, i;
        parsed.variants.sort(function (a, b) { return b.height - a.height; });
        for (i = 0; i < parsed.variants.length; i++) {
            v = parsed.variants[i];
            var key = v.height || v.bandwidth;
            if (byHeight[key]) { continue; }
            byHeight[key] = 1;
            uniq.push(v);
        }
        clearButtons();
        say('🎬 Pick a quality:', '#1a202c');
        uniq.forEach(function (variant) {
            addButton(labelFor(variant), function () {
                save(buildFromVariant(variant, parsed.audio), labelFor(variant));
            });
        });
        return true;
    }

    function trigger() {
        if (!lastPlaylist) { return; }
        var b = new Blob([lastPlaylist], { type: 'application/vnd.apple.mpegurl' });
        var u = URL.createObjectURL(b);
        var l = document.createElement('a');
        l.href = u;
        l.download = 'coupang_stream.m3u8';
        document.body.appendChild(l);
        l.click();
        l.remove();
    }

    function save(text, qualityLabel) {
        lastPlaylist = text;
        trigger();
        clearButtons();
        if (pickerFor) {
            addButton('↺ Other quality', function () { showPicker(pickerFor); });
        }
        addButton('⬇ Save again', trigger);
        say('✅ ' + (qualityLabel ? (qualityLabel + ' ') : '') + 'playlist downloaded. Open coupang_stream.m3u8 with VLC', '#14532d');
    }

    function check() {
        if (checkTimer) { clearTimeout(checkTimer); }
        checkTimer = setTimeout(doCheck, 1200);
    }

    function anyPending() {
        var i;
        for (i = 0; i < order.length; i++) { if (types[order[i]] === undefined) { return true; } }
        return false;
    }

    function doCheck() {
        var m = latest('master');
        if (m && texts[m] && m !== pickerFor) {
            if (showPicker(m)) { return; }
        }
        if (pickerFor) { return; }
        if (hasDownloaded()) { return; }
        if (!m && anyPending() && (Date.now() - firstSeen) < 8000) {
            check();
            return;
        }
        var v = latest('video');
        var a = v ? pickAudio(v) : null;
        if (v && a) {
            done[keyOf(v) + '|' + keyOf(a)] = 1;
            var out = '#EXTM3U\n#EXT-X-VERSION:6\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Korean",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="ko",URI="' + a + '"\n#EXT-X-STREAM-INF:BANDWIDTH=3000000,AUDIO="audio"\n' + v + '\n';
            save(out, '');
        } else if (latest('drm')) {
            say('⚠️ This match can’t be grabbed. Try a different one.', '#7c2d12');
        }
    }

    function common(a, b) {
        var i = 0, n = Math.min(a.length, b.length);
        while (i < n && a.charAt(i) === b.charAt(i)) { i++; }
        return i;
    }

    function pickAudio(v) {
        var best = null, bl = -1, i, u, c;
        for (i = 0; i < order.length; i++) {
            u = order[i];
            if (types[u] === 'audio') {
                c = common(keyOf(u), keyOf(v));
                if (c >= bl) { best = u; bl = c; }
            }
        }
        return best;
    }

    function armFallback() {
        if (fallbackTimer) { return; }
        fallbackTimer = setTimeout(function () {
            if (hasDownloaded() || pickerFor) { return; }
            if (dashSeen && !order.length) {
                say('⚠️ This match can’t be grabbed. Try a different one (e.g. Premier League).', '#7c2d12');
                return;
            }
            if (!order.length) { return; }
            say('⚠️ Could not auto-detect quality. Tap here to finish on Done Deal', '#7c2d12');
            ui.style.cursor = 'pointer';
            ui.onclick = function () {
                location.href = SITE + '?streams=' + encodeURIComponent(order.slice(-8).join('|'));
            };
        }, 12000);
    }

    function consider(u) {
        if (isMpd(u)) { dashSeen = true; armFallback(); return; }
        if (!isM3u8(u)) { return; }
        var k = keyOf(u);
        if (seen[k]) { return; }
        seen[k] = 1;
        if (!firstSeen) { firstSeen = Date.now(); }
        order.push(u);
        if (!pickerFor && !hasDownloaded()) { say('Analyzing stream manifests…'); }
        armFallback();
        classify(u).then(check);
    }

    function scan() {
        performance.getEntriesByType('resource').forEach(function (r) { consider(r.name); });
    }

    try { performance.setResourceTimingBufferSize(10000); } catch (e) {}
    makeUI();
    say('Watching for streams. Open a live broadcast…');
    try {
        obs = new PerformanceObserver(function (list) {
            list.getEntries().forEach(function (r) { consider(r.name); });
        });
        obs.observe({ type: 'resource', buffered: true });
    } catch (e) { setInterval(scan, 2000); }
    scan();

    W.__rocketGrab = { rescan: scan };
}

const CANONICAL_SITE = 'https://yeolj00.github.io/personal-projects/live-here-we-go/';

function siteUrl() {
    const h = window.location.hostname;
    if (!h || h === 'localhost' || h === '127.0.0.1' || window.location.protocol === 'file:') {
        return CANONICAL_SITE;
    }
    return window.location.origin + window.location.pathname;
}

function buildBookmarklet() {
    const target = siteUrl();
    // Collapse each newline + indentation to a single space; safe because the
    // agent contains no comments and no strings spanning lines.
    const src = rocketGrabAgent.toString().replace(/\n\s*/g, ' ');
    return 'javascript:(' + src + ')(' + JSON.stringify(target) + ')';
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
