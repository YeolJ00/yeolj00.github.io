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

const buttons = page => page.evaluate(() =>
  Array.from(document.querySelectorAll('#rocketgrab button')).map(b => b.textContent));
const statusText = page => page.evaluate(() => {
  const s = document.getElementById('rocketgrab');
  return s && s.firstChild ? s.firstChild.textContent : '';
});
const clickButton = (page, label) => page.evaluate(l => {
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
  assert(bm.length < 500, 'bookmarklet is short (a loader, not the whole agent) so mobile bookmark editors do not truncate it');
  console.log('  bookmarklet length:', bm.length, 'chars');
  await page.close();

  // === Scenario 1: arm first, tap broadcast, master auto-downloads =========
  console.log('\nScenario 1: arm first -> auto-download master, no picker');
  const dl1 = freshDir('dl1');
  page = await browser.newPage();
  const dls1 = await trackDownloads(page, dl1);
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  assert(await waitFor(async () => (await statusText(page)).includes('Watching for streams'), 5000),
    'overlay shows "Watching for streams"');

  await page.click('#live');
  assert(await waitFor(() => dls1.completed >= 1, 12000), 'master playlist auto-downloads with no quality picker');
  assert(!(await statusText(page)).includes('Pick a quality'), 'no quality picker is shown');
  assert((await statusText(page)).includes('Playlist downloaded'), 'success message shown');
  const c1 = fs.readFileSync(path.join(dl1, dls1.begun[0]), 'utf8');
  assert(c1.includes('RESOLUTION=3840x2160') && c1.includes('RESOLUTION=1920x1080') &&
    c1.includes('RESOLUTION=1280x720') && c1.includes('RESOLUTION=640x360'),
    'downloaded playlist keeps the full resolution ladder (no single quality picked)');
  assert(c1.includes(BASE + '/streams/video_2.m3u8'), 'variant stream URIs are rewritten to absolute URLs');
  assert(/URI="[^"]*audio_ko\.m3u8"/.test(c1) && c1.includes(BASE + '/streams/audio_ko.m3u8'),
    'Korean audio URI is rewritten to an absolute URL');
  assert(/URI="[^"]*audio_en\.m3u8"/.test(c1) && c1.includes(BASE + '/streams/audio_en.m3u8'),
    'other audio tracks are kept as-is (not filtered down)');
  const after1 = await buttons(page);
  assert(after1.join(',') === '\u2b07 Save again', 'only offers "Save again" after download');
  await page.close();

  // === Scenario 2: "Save again" re-downloads the same playlist =============
  console.log('\nScenario 2: Save again re-downloads');
  const dl2 = freshDir('dl2');
  page = await browser.newPage();
  const dls2 = await trackDownloads(page, dl2);
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  await page.click('#live');
  await waitFor(() => dls2.completed >= 1, 12000);
  await clickButton(page, '\u2b07 Save again');
  assert(await waitFor(() => dls2.completed >= 2, 5000), 'second download completes on "Save again"');
  const files2 = fs.readdirSync(dl2).filter(f => !f.endsWith('.crdownload'));
  const contents2 = files2.map(f => fs.readFileSync(path.join(dl2, f), 'utf8'));
  assert(contents2.every(c => c.includes('RESOLUTION=3840x2160')), 'both downloads are the same full master playlist');
  await page.close();

  // === Scenario 3: double invocation is safe ===============================
  console.log('\nScenario 3: double invocation is safe');
  page = await browser.newPage();
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  await page.evaluate(code);
  await waitFor(async () => (await page.evaluate(() => document.querySelectorAll('#rocketgrab').length)) > 0, 5000);
  await sleep(300);
  const overlays = await page.evaluate(() => document.querySelectorAll('#rocketgrab').length);
  assert(overlays === 1, 'only one overlay after running twice');
  await page.close();

  // === Scenario 4: switching broadcasts ====================================
  console.log('\nScenario 4: switch broadcast, auto-downloads again');
  const dl4 = freshDir('dl4');
  page = await browser.newPage();
  const dls4 = await trackDownloads(page, dl4);
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  await page.click('#live');
  await waitFor(() => dls4.completed >= 1, 12000);
  await sleep(800);
  await page.click('#switch');
  assert(await waitFor(() => dls4.completed >= 2, 12000), 'second (channel 2) download completes automatically');
  const files4 = fs.readdirSync(dl4).filter(f => !f.endsWith('.crdownload'));
  const contents4 = files4.map(f => fs.readFileSync(path.join(dl4, f), 'utf8'));
  assert(contents4.some(c => c.includes('/streams2/')), 'a download references the second channel');
  assert(contents4.some(c => c.includes('/streams/') && !c.includes('/streams2/')), 'a download references the first channel only');
  await page.close();

  // === Scenario 5: unsupported (DASH) broadcast is refused cleanly =========
  console.log('\nScenario 5: unsupported broadcast');
  const dl5 = freshDir('dl5');
  page = await browser.newPage();
  const dls5 = await trackDownloads(page, dl5);
  await page.goto(BASE + '/fake.html');
  await page.evaluate(code);
  await page.click('#dash');
  assert(await waitFor(async () => (await statusText(page)).includes('be grabbed'), 15000),
    'shows a neutral "can’t be grabbed" message (no DRM wording)');
  assert(!(await statusText(page)).includes('DRM'), 'message does not mention DRM');
  await sleep(1000);
  assert(dls5.completed === 0, 'no file downloaded for an unsupported stream');
  await page.close();

  await browser.close();
  console.log('\nALL TESTS PASSED');
  process.exit(0);
})().catch(e => { console.error('\n' + e.stack); process.exit(1); });
