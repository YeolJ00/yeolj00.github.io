// The Here We Go in-page agent. Loaded by the tiny bookmarklet on the
// Coupang tab (see buildBookmarklet() in script.js), not by the toolkit page
// itself. Unlike the old inline bookmarklet this file is a normal script:
// comments and formatting are fine here, nothing gets toString()'d.
(function () {
    var ownSrc = (document.currentScript && document.currentScript.src) || '';
    var m = /[?&]site=([^&]*)/.exec(ownSrc);
    var SITE = m ? decodeURIComponent(m[1]) : 'https://yeolj00.github.io/personal-projects/live-here-we-go/';

    rocketGrabAgent(SITE);

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
})();
