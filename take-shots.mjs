// take-shots.mjs — renders the game's own code in a headless browser and takes
// its 3-4 screenshots. Serves game/ on a local port, opens each shot URL from
// shots.json (the query presets a mid-game state: found differences, a scene, or
// the win screen), waits for the canvases to paint, and saves a JPEG per shot.
// Every file must be at most 262144 bytes; the script throws otherwise.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-sdk/node_modules/playwright');
const executablePath = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const nodeBin = '/home/hatch/workspace/tools/node-v22.23.4-linux-x64/bin/node';

const here = fileURLToPath(new URL('.', import.meta.url));
const shots = JSON.parse(await readFile(new URL('./shots.json', import.meta.url), 'utf8'));
const directory = new URL('./screenshots/', import.meta.url);
await mkdir(directory, { recursive: true });

const PORT = 8123;
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
  try {
    for (const shot of shots) {
      const context = await browser.newContext({ viewport: shot.viewport });
      const page = await context.newPage();
      page.on('pageerror', (err) => { throw err; });
      await page.goto(`http://127.0.0.1:${PORT}${shot.url}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__harbour && window.__harbour.state().scene !== undefined);
      await page.waitForTimeout(900);
      const out = fileURLToPath(new URL(`./screenshots/${shot.file}`, import.meta.url));
      await page.screenshot({ path: out, type: 'jpeg', quality: 80 });
      const size = (await stat(out)).size;
      console.log(`${shot.file}: ${size} bytes`);
      assert.ok(size <= 262144, `${shot.file} is ${size} bytes, over the 256 KiB cap`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
console.log('all shots taken');
