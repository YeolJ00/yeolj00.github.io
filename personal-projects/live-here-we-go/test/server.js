const http = require('http');
const fs = require('fs');
const path = require('path');

const TOOLKIT = path.join(__dirname, '..');

// Mirrors Coupang's real HLS structure: a master playlist that lists several
// video renditions (RESOLUTION ladder) plus audio tracks via EXT-X-MEDIA, and
// the underlying media playlists. Channel 1 = clear HLS with a quality ladder;
// channel 2 = clear HLS (different renditions) to test broadcast switching.
const FAKE_PAGE = `<!DOCTYPE html>
<html><head><title>Fake Coupang Play</title></head>
<body>
<h1>Fake Coupang Play (desktop site)</h1>
<button id="live">Open live broadcast</button>
<button id="switch">Switch to broadcast 2</button>
<button id="dash">Open DRM/DASH broadcast</button>
<div id="player"></div>
<script>
// SPA player: clicking a broadcast requests the master once, then media
// playlists on a refresh loop with ROTATING tokens (like signed URLs).
function play(dir) {
  clearInterval(window.__interval);
  document.getElementById('player').textContent = 'playing ' + dir + '...';
  fetch('/' + dir + '/master.m3u8?t=' + Date.now());
  window.__interval = setInterval(function () {
    fetch('/' + dir + '/video_2.m3u8?token=' + Date.now());
    fetch('/' + dir + '/audio_ko.m3u8?token=' + Date.now());
  }, 600);
}
document.getElementById('live').onclick = function () { play('streams'); };
document.getElementById('switch').onclick = function () { play('streams2'); };
document.getElementById('dash').onclick = function () {
  clearInterval(window.__interval);
  document.getElementById('player').textContent = 'playing DASH...';
  fetch('/streams3/index.mpd?t=' + Date.now());
};
</script>
</body></html>`;

function master(dir) {
  return '#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-INDEPENDENT-SEGMENTS\n' +
    '#EXT-X-MEDIA:LANGUAGE="ko",AUTOSELECT=YES,TYPE=AUDIO,URI="audio_ko.m3u8",GROUP-ID="audio_0",DEFAULT=YES,NAME="ko"\n' +
    '#EXT-X-MEDIA:LANGUAGE="en",AUTOSELECT=YES,TYPE=AUDIO,URI="audio_en.m3u8",GROUP-ID="audio_0",DEFAULT=NO,NAME="en"\n' +
    '#EXT-X-STREAM-INF:BANDWIDTH=16711200,RESOLUTION=3840x2160,CODECS="hvc1.2.4.L153.B0,mp4a.40.2",AUDIO="audio_0"\nvideo_0.m3u8\n' +
    '#EXT-X-STREAM-INF:BANDWIDTH=7911200,RESOLUTION=1920x1080,CODECS="hvc1.2.4.L123.B0,mp4a.40.2",AUDIO="audio_0"\nvideo_2.m3u8\n' +
    '#EXT-X-STREAM-INF:BANDWIDTH=3511200,RESOLUTION=1280x720,CODECS="avc1.640029,mp4a.40.2",AUDIO="audio_0"\nvideo_3.m3u8\n' +
    '#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=640x360,CODECS="avc1.4D401F,mp4a.40.2",AUDIO="audio_0"\nvideo_5.m3u8\n';
}
const media = kind => '#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-TARGETDURATION:4\n#EXTINF:4.0,\n' + kind + '_00001.mp4\n';

const MANIFESTS = {
  '/streams/master.m3u8': master('streams'),
  '/streams/video_0.m3u8': media('video'),
  '/streams/video_2.m3u8': media('video'),
  '/streams/video_3.m3u8': media('video'),
  '/streams/video_5.m3u8': media('video'),
  '/streams/audio_ko.m3u8': media('audio'),
  '/streams/audio_en.m3u8': media('audio'),
  '/streams2/master.m3u8': master('streams2'),
  '/streams2/video_0.m3u8': media('video'),
  '/streams2/video_2.m3u8': media('video'),
  '/streams2/video_3.m3u8': media('video'),
  '/streams2/video_5.m3u8': media('video'),
  '/streams2/audio_ko.m3u8': media('audio'),
  '/streams2/audio_en.m3u8': media('audio')
};

const DASH = '<?xml version="1.0"?><MPD xmlns:mspr="urn:microsoft:playready" type="dynamic"><Period><AdaptationSet mimeType="video/mp4"><ContentProtection schemeIdUri="urn:mpeg:dash:mp4protection:2011"/></AdaptationSet></Period></MPD>';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/fake.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(FAKE_PAGE);
  }
  if (url === '/streams3/index.mpd') {
    res.writeHead(200, { 'content-type': 'application/dash+xml', 'access-control-allow-origin': '*' });
    return res.end(DASH);
  }
  if (MANIFESTS[url]) {
    res.writeHead(200, {
      'content-type': 'application/vnd.apple.mpegurl',
      'access-control-allow-origin': '*'
    });
    return res.end(MANIFESTS[url]);
  }
  if (url.startsWith('/toolkit/')) {
    const file = path.join(TOOLKIT, url.slice('/toolkit/'.length) || 'index.html');
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      return res.end(fs.readFileSync(file));
    }
  }
  res.writeHead(404);
  res.end('not found');
});

module.exports = new Promise(resolve => server.listen(8123, () => resolve(server)));
