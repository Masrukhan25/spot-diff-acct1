// playtest.mjs — drives the real game in a headless browser and checks every
// mechanic: find, wrong click, hint, pause, keyboard, scene clear, win.
// Prints one PASS/FAIL line per check and exits non-zero on any failure.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-sdk/node_modules/playwright');
const executablePath = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const nodeBin = '/home/hatch/workspace/tools/node-v22.23.4-linux-x64/bin/node';

const here = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8124;
const results = [];

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

const server = spawn(nodeBin, ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'ignore' });
const waitForServer = async () => {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('serve.ts did not come up');
};

try {
  await waitForServer();
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__harbour);
  await page.waitForTimeout(600);

  const state = () => page.evaluate(() => window.__harbour.state());

  // 1. Fresh load: scene 1, 7 to find, no strikes.
  let s = await state();
  check('fresh load: scene 1, 7 to find', s.scene === 0 && s.toFind === 7 && s.strikes === 0, JSON.stringify(s));

  // 2. Real mouse click on a known difference (the sun, scene coords 820,118)
  //    in the LEFT panel: a gold ring appears on both panels, counter drops.
  const box = await page.locator('#panel-left').boundingBox();
  await page.mouse.click(box.x + (820 / 1000) * box.width, box.y + (118 / 750) * box.height);
  await page.waitForTimeout(300);
  s = await state();
  check('click found difference: ring + counter 7->6', s.found.includes('d1') && s.toFind === 6 && s.score >= 100, JSON.stringify(s));
  const toFindText = await page.locator('#to-find').textContent();
  check('HUD counter shows 6 to find', toFindText.includes('6 to find'), toFindText);

  // 3. Real mouse click on empty sand: a strike, score unchanged.
  const scoreBefore = s.score;
  await page.mouse.click(box.x + (500 / 1000) * box.width, box.y + (700 / 750) * box.height);
  await page.waitForTimeout(300);
  s = await state();
  check('wrong click: strike 0->1, score unchanged', s.strikes === 1 && s.score === scoreBefore, JSON.stringify(s));

  // 4. Hint key: hints 3->2 and a pulse is set.
  await page.keyboard.press('h');
  await page.waitForTimeout(200);
  s = await state();
  check('hint key H: hints 3->2', s.hintsLeft === 2, JSON.stringify(s));

  // 5. Pause key: paused true, then false again.
  await page.keyboard.press('p');
  await page.waitForTimeout(200);
  s = await state();
  const pausedOnce = s.paused === true;
  await page.keyboard.press('p');
  await page.waitForTimeout(200);
  s = await state();
  check('pause key P toggles', pausedOnce && s.paused === false, JSON.stringify(s));

  // 6. Keyboard Enter guesses at the crosshair: put it on the pink cloud (520,66).
  await page.evaluate(() => { window.__harbour.game.crosshair = { x: 520, y: 66, visible: true }; });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  s = await state();
  check('keyboard Enter finds the cloud', s.found.includes('d2') && s.toFind === 5, JSON.stringify(s));

  // 7. Finish scene 1 through the handle: overlay offers the next scene.
  await page.evaluate(() => {
    const g = window.__harbour.game;
    for (const d of g.scene.diffs) if (!g.found.has(d.id)) g.guessAt(d.x, d.y);
  });
  await page.waitForTimeout(300);
  s = await state();
  const overlayTitle = await page.locator('#overlay-title').textContent();
  check('scene 1 cleared: overlay + sceneDone', s.sceneDone === true && overlayTitle.includes('Scene complete'), overlayTitle);

  // 8. Next scene via the N key.
  await page.keyboard.press('n');
  await page.waitForTimeout(300);
  s = await state();
  check('N key moves to scene 2', s.scene === 1 && s.toFind === 7, JSON.stringify(s));

  // 9. Clear scenes 2 and 3. Scene 3's clear shows "Harbour complete!" with a
  //    button to the total — click it, then the win screen appears.
  await page.evaluate(() => {
    const g = window.__harbour.game;
    for (let scene = 1; scene < 3; scene++) {
      for (const d of g.scene.diffs) if (!g.found.has(d.id)) g.guessAt(d.x, d.y);
      if (scene === 1) g.loadScene(2);
    }
  });
  await page.waitForTimeout(400);
  const harbourTitle = await page.locator('#overlay-title').textContent();
  check('scene 3 cleared: Harbour complete overlay', harbourTitle.includes('Harbour complete'), harbourTitle);
  await page.locator('#overlay-btn').click();
  await page.waitForTimeout(300);
  s = await state();
  const winTitle = await page.locator('#overlay-title').textContent();
  check('all 3 scenes cleared: win screen', s.won === true && /found them all/i.test(winTitle), winTitle + ' ' + JSON.stringify(s));

  // 10. Best score persisted to localStorage.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('harbour-at-dawn-v1') || '{}'));
  check('best score saved to localStorage', saved.best === s.score && s.score > 0, JSON.stringify(saved));

  // 11. No page errors or console errors during the whole run.
  check('no page/console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  // 12. No network requests left the local server.
  const requests = [];
  page.on('request', (req) => requests.push(req.url()));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const external = requests.filter((u) => !u.startsWith(`http://127.0.0.1:${PORT}`) && !u.startsWith('data:'));
  check('no external network requests', external.length === 0, external.join(', ').slice(0, 200));

  await browser.close();
} finally {
  server.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
