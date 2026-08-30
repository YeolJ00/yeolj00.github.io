const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8123';

function freshDir(name) {
  const d = path.join(__dirname, name);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  return d;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  console.log('  \u2714 ' + msg);
}

async function trackDownloads(page, dir) {
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allowAndName', downloadPath: dir, eventsEnabled: true
  });
  const state = { begun: [], completed: 0 };
  cdp.on('Browser.downloadWillBegin', e => state.begun.push(e.guid));
  cdp.on('Browser.downloadProgress', e => { if (e.state === 'completed') state.completed++; });
  return state;
}

async function waitFor(fn, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await fn()) return true;
    await sleep(200);
  }
  return false;
}

const qualityButtons = page => page.evaluate(() =>
  Array.from(document.querySelectorAll('#rocketgrab button')).map(b => b.textContent));
const statusText = page => page.evaluate(() => {
  const s = document.getElementById('rocketgrab');
  return s && s.firstChild ? s.firstChild.textContent : '';
});
const clickQuality = (page, label) => page.evaluate(l => {
  const b = Array.from(document.querySelectorAll('#rocketgrab button')).find(x => x.textContent === l);
  if (b) b.click();
}, label);

(async () => {
  await require('./server');
  console.log('server up on :8123');

  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', args: ['--no-first-run']
  });

  // --- bookmarklet sanity ---------------------------------------------------
  let page = await browser.newPage();
  await page.goto(BASE + '/toolkit/index.html');
  const bm = await page.$eval('#bookmarkletCode', el => el.textContent);
  assert(bm.startsWith('javascript:'), 'bookmarklet starts with javascript:');
  const code = bm.slice('javascript:'.length);
  assert(!code.includes('\n'), 'bookmarklet is a single line (no comment breakage)');
  new Function(code);
  assert(true, 'bookmarklet is syntactically valid JS');
  console.log('  bookmarklet length:', bm.length, 'chars');
  await page.close();

  // === Scenario 1: arm first, tap broadcast, pick a quality =================
  console.log('\nScenario 1: arm first -> pick quality');
  const dl1 = freshDir('dl1');
  page = await browser.newPage();
  const dls1 = await trackDownloads(page, dl1);
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  await sleep(300);
  assert((await statusText(page)).includes('Watching for streams'), 'overlay shows "Watching for streams"');

  await page.click('#live');
  assert(await waitFor(async () => (await qualityButtons(page)).some(l => /p$|4K/.test(l)), 12000),
    'quality picker appears after opening a broadcast');
  const labels = await qualityButtons(page);
  console.log('  quality buttons:', JSON.stringify(labels));
  assert(labels.join(',') === '4K,1080p,720p,360p', 'picker lists the master ladder, highest-first, deduped');
  assert((await statusText(page)).includes('Pick a quality'), 'status says "Pick a quality"');

  await clickQuality(page, '1080p');
  assert(await waitFor(() => dls1.completed >= 1, 8000), '1080p download completes');
  const c1 = fs.readFileSync(path.join(dl1, dls1.begun[0]), 'utf8');
  assert(c1.includes('RESOLUTION=1920x1080'), 'downloaded playlist is the 1080p rendition');
  assert(c1.includes('video_2.m3u8'), 'references the 1080p video media playlist');
  assert(/URI="[^"]*audio_ko\.m3u8"/.test(c1), 'Korean audio track is included as EXT-X-MEDIA');
  assert(!c1.includes('audio_en'), 'English audio is not used (Korean preferred)');
  assert((await statusText(page)).includes('1080p'), 'success message names the chosen quality');
  const after = await qualityButtons(page);
  assert(after.includes('\u21ba Other quality') && after.includes('\u2b07 Save again'),
    'offers "Other quality" and "Save again" after download');
  await page.close();

  // === Scenario 2: pick a DIFFERENT quality via "Other quality" ============
  console.log('\nScenario 2: re-pick a different quality');
  const dl2 = freshDir('dl2');
  page = await browser.newPage();
  const dls2 = await trackDownloads(page, dl2);
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  await page.click('#live');
  await waitFor(async () => (await qualityButtons(page)).some(l => /p$|4K/.test(l)), 12000);
  await clickQuality(page, '4K');
  await waitFor(() => dls2.completed >= 1, 8000);
  await clickQuality(page, '\u21ba Other quality');
  assert(await waitFor(async () => (await qualityButtons(page)).includes('720p'), 5000),
    'picker re-opens on "Other quality"');
  await clickQuality(page, '720p');
  assert(await waitFor(() => dls2.completed >= 2, 8000), 'second (720p) download completes');
  const files2 = fs.readdirSync(dl2).filter(f => !f.endsWith('.crdownload'));
  const contents2 = files2.map(f => fs.readFileSync(path.join(dl2, f), 'utf8'));
  assert(contents2.some(c => c.includes('RESOLUTION=3840x2160')), 'first download was 4K');
  assert(contents2.some(c => c.includes('RESOLUTION=1280x720')), 'second download was 720p');
  await page.close();

  // === Scenario 3: double invocation is safe ===============================
  console.log('\nScenario 3: double invocation is safe');
  page = await browser.newPage();
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  await page.evaluate(code);
  const overlays = await page.evaluate(() => document.querySelectorAll('#rocketgrab').length);
  assert(overlays === 1, 'only one overlay after running twice');
  await page.close();

  // === Scenario 4: switching broadcasts ====================================
  console.log('\nScenario 4: switch broadcast, pick again');
  const dl4 = freshDir('dl4');
  page = await browser.newPage();
  const dls4 = await trackDownloads(page, dl4);
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  await page.click('#live');
  await waitFor(async () => (await qualityButtons(page)).some(l => /p$|4K/.test(l)), 12000);
  await clickQuality(page, '1080p');
  await waitFor(() => dls4.completed >= 1, 8000);
  await sleep(800);
  await page.click('#switch');
  assert(await waitFor(async () => {
    const b = await qualityButtons(page);
    return b.includes('1080p') && (await statusText(page)).includes('Pick a quality');
  }, 12000), 'quality picker auto-reopens for the new broadcast');
  await clickQuality(page, '720p');
  assert(await waitFor(() => dls4.completed >= 2, 10000), 'second (channel 2) download completes');
  const files4 = fs.readdirSync(dl4).filter(f => !f.endsWith('.crdownload'));
  const contents4 = files4.map(f => fs.readFileSync(path.join(dl4, f), 'utf8'));
  assert(contents4.some(c => c.includes('/streams2/')), 'a download references the second channel');
  for (const c of contents4) {
    const ch = c.includes('/streams2/') ? '/streams2/' : '/streams/';
    assert(c.includes(ch + 'video_') && c.includes(ch + 'audio_') &&
      !(c.includes('/streams/video') && c.includes('/streams2/video')),
      'download pairs video+audio from the same channel (' + ch + ')');
  }
  await page.close();

  // === Scenario 5: DRM / DASH broadcast is refused cleanly =================
  console.log('\nScenario 5: DRM/DASH broadcast');
  const dl5 = freshDir('dl5');
  page = await browser.newPage();
  const dls5 = await trackDownloads(page, dl5);
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  await page.click('#dash');
  assert(await waitFor(async () => (await statusText(page)).includes('DRM'), 15000),
    'shows a DRM/DASH "not supported" message');
  await sleep(1000);
  assert(dls5.completed === 0, 'no file downloaded for a DRM/DASH stream');
  await page.close();

  await browser.close();
  console.log('\nALL TESTS PASSED');
  process.exit(0);
})().catch(e => { console.error('\n' + e.stack); process.exit(1); });
