# RocketGrab end-to-end tests

Runs the real bookmarklet (read from the live `index.html`) inside headless
Chrome against a fake Coupang-Play-like page that requests audio/video m3u8
manifests with rotating signed tokens.

```
npm install
npm test
```

Requires Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`
(edit `CHROME` in test.js otherwise).

Scenarios:
1. Arm RocketGrab first, then open a broadcast -> one auto-download, correct
   audio/video pairing, no duplicate downloads despite token rotation.
2. Stream already playing, run RocketGrab after -> instant download.
3. Running the bookmarklet twice is safe (single overlay).
4. Switching broadcasts in the SPA -> a second download, each playlist pairs
   audio+video from the same channel (no cross-channel mixing).
