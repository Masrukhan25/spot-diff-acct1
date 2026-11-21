// game.js — the "Harbour at Dawn" game state machine.
//
// Owns everything the player can do: click a panel to guess, earn strikes for
// wrong clicks, spend hints, pause, move a crosshair with the keyboard, and clear
// three scenes of seven differences each. Rendering is delegated to draw.js and
// sounds to sound.js; this file only decides what is true and when to repaint.
//
// State is kept in plain fields and saved to localStorage under HARBOUR_KEY
// (best score and per-scene best times). A fresh load starts scene 1; the URL
// may preset a mid-game state for screenshots (?scene=0&found=0,2,4, ?win=1).

import { SCENES, SCENE_W, SCENE_H, diffAt } from './scenes.js';
import { drawScene } from './draw.js';
import { playFind, playWrong, playClick, playSceneClear, playWin, setMuted, isMuted } from './sound.js';

export const HARBOUR_KEY = 'harbour-at-dawn-v1';
const MAX_STRIKES = 3;
const HINTS_PER_SCENE = 3;
const FIND_POINTS = 100;
const STREAK_BONUS = 25;

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function loadSave() {
  try {
    const raw = localStorage.getItem(HARBOUR_KEY);
    if (!raw) return { best: 0, bestTimes: {} };
    const data = JSON.parse(raw);
    return { best: data.best || 0, bestTimes: data.bestTimes || {} };
  } catch {
    return { best: 0, bestTimes: {} };
  }
}

export class HarbourGame {
  constructor(doc) {
    this.doc = doc;
    this.save = loadSave();
    this.sceneIndex = 0;
    this.found = new Set();
    this.latest = null;
    this.strikes = 0;
    this.hintsLeft = HINTS_PER_SCENE;
    this.score = 0;
    this.streak = 0;
    this.sceneStart = Date.now();
    this.sceneElapsed = 0;
    this.totalElapsed = 0;
    this.paused = false;
    this.over = false;
    this.won = false;
    this.sceneDone = false;
    this.crosshair = { x: SCENE_W / 2, y: SCENE_H / 2, visible: false };
    this.flash = null;
    this.hintPulse = null;
    this.dirty = true;
    this.animating = false;
    this.leftCtx = null;
    this.rightCtx = null;
    this._lastTick = Date.now();
    this._raf = null;
  }

  get scene() {
    return SCENES[this.sceneIndex];
  }

  get toFind() {
    return this.scene.diffs.length - this.found.size;
  }

  // ---- lifecycle ---------------------------------------------------------

  start() {
    const doc = this.doc;
    this.leftCtx = doc.getElementById('panel-left').getContext('2d');
    this.rightCtx = doc.getElementById('panel-right').getContext('2d');
    this.bindPanels();
    this.bindHud();
    this.bindKeyboard();
    this.applyPreset();
    this.updateHud();
    this.requestRender();
    this._raf = requestAnimationFrame(() => this.loop());
    window.setInterval(() => this.tick(), 200);
  }

  // URL presets used by the screenshot script: ?scene=N&found=0,2,4 and ?win=1.
  applyPreset() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('win') === '1') {
      this.sceneIndex = SCENES.length - 1;
      this.found = new Set(this.scene.diffs.map((d) => d.id));
      this.score = this.scene.diffs.length * FIND_POINTS + 450;
      this.totalElapsed = SCENES.reduce((sum, s) => sum + s.parSeconds, 0) * 1000;
      this.showWin();
      return;
    }
    const sceneParam = Number(params.get('scene'));
    if (Number.isInteger(sceneParam) && sceneParam >= 0 && sceneParam < SCENES.length) {
      this.sceneIndex = sceneParam;
    }
    const foundParam = params.get('found');
    if (foundParam) {
      const indices = foundParam.split(',').map(Number).filter((i) => Number.isInteger(i) && this.scene.diffs[i]);
      for (const i of indices) {
        this.found.add(this.scene.diffs[i].id);
        this.score += FIND_POINTS;
      }
      if (indices.length > 0) this.latest = this.scene.diffs[indices[indices.length - 1]].id;
      this.hintsLeft = HINTS_PER_SCENE;
    }
  }

  loadScene(index) {
    this.sceneIndex = index;
    this.found = new Set();
    this.latest = null;
    this.strikes = 0;
    this.hintsLeft = HINTS_PER_SCENE;
    this.sceneElapsed = 0;
    this.sceneStart = Date.now();
    this.sceneDone = false;
    this.over = false;
    this.won = false;
    this.flash = null;
    this.hintPulse = null;
    this.hideOverlay();
    this.updateHud();
    this.requestRender();
  }

  restartAll() {
    this.score = 0;
    this.streak = 0;
    this.totalElapsed = 0;
    this.loadScene(0);
  }

  // ---- guessing ----------------------------------------------------------

  // A guess at scene coordinates (x, y) on either panel.
  guessAt(x, y) {
    if (this.paused || this.over || this.sceneDone) return 'blocked';
    const diff = diffAt(this.scene, x, y);
    if (!diff) {
      this.strikes += 1;
      this.streak = 0;
      this.flash = { x, y, until: Date.now() + 600 };
      playWrong();
      if (this.strikes >= MAX_STRIKES) {
        this.over = true;
        this.showFailed();
      }
      this.updateHud();
      this.requestRender();
      return 'wrong';
    }
    if (this.found.has(diff.id)) return 'already';
    this.found.add(diff.id);
    this.latest = diff.id;
    this.streak += 1;
    this.score += FIND_POINTS + (this.streak - 1) * STREAK_BONUS;
    playFind();
    if (this.found.size === this.scene.diffs.length) {
      this.clearScene();
    }
    this.updateHud();
    this.requestRender();
    return 'found';
  }

  clearScene() {
    this.sceneDone = true;
    const elapsed = this.sceneElapsedMs();
    this.totalElapsed += elapsed;
    const bonus = Math.max(0, this.scene.parSeconds - Math.floor(elapsed / 1000)) * 5;
    this.score += bonus;
    const best = this.save.bestTimes[this.scene.id];
    if (!best || elapsed < best) {
      this.save.bestTimes[this.scene.id] = elapsed;
      this.persist();
    }
    playSceneClear();
    const last = this.sceneIndex === SCENES.length - 1;
    this.showOverlay(
      last ? 'Harbour complete!' : 'Scene complete!',
      last
        ? 'Every difference in all three scenes is found. See your total below.'
        : 'All 7 differences found in ' + fmtTime(elapsed) + ' — time bonus +' + bonus + '.',
      last ? 'See your total' : 'Next scene',
      () => (last ? this.showWin() : this.loadScene(this.sceneIndex + 1)),
    );
  }

  showWin() {
    this.won = true;
    playWin();
    const best = this.save.best < this.score;
    if (best) {
      this.save.best = this.score;
      this.persist();
    }
    this.showOverlay(
      'You found them all!',
      'Three harbours, 21 differences, ' + fmtTime(this.totalElapsed) + ' total. Score ' + this.score +
        (best ? ' — a new best!' : ' — best ' + this.save.best + '.'),
      'Play again',
      () => this.restartAll(),
    );
  }

  showFailed() {
    this.showOverlay(
      'Out of strikes',
      'Three wrong clicks in one scene ends the run. The harbour keeps its secrets — try the scene again.',
      'Retry this scene',
      () => this.loadScene(this.sceneIndex),
    );
  }

  useHint() {
    if (this.paused || this.over || this.sceneDone) return false;
    if (this.hintsLeft <= 0) return false;
    const remaining = this.scene.diffs.filter((d) => !this.found.has(d.id));
    if (remaining.length === 0) return false;
    const pick = remaining[Math.floor(remaining.length / 2)];
    this.hintsLeft -= 1;
    this.hintPulse = { diff: pick, until: Date.now() + 2600 };
    playClick();
    this.updateHud();
    this.requestRender();
    return true;
  }

  togglePause() {
    if (this.over || this.sceneDone || this.won) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.sceneElapsed += Date.now() - this.sceneStart;
      this.showOverlay('Paused', 'Take a breath. The harbour will wait.', 'Resume', () => this.togglePause());
    } else {
      this.sceneStart = Date.now();
      this.hideOverlay();
    }
    this.updateHud();
    this.requestRender();
  }

  // ---- time --------------------------------------------------------------

  sceneElapsedMs() {
    if (this.paused) return this.sceneElapsed;
    return this.sceneElapsed + (Date.now() - this.sceneStart);
  }

  tick() {
    if (this.paused || this.over || this.sceneDone) return;
    const now = Date.now();
    if (now - this._lastTick >= 1000) {
      this._lastTick = now;
      const timer = this.doc.getElementById('timer');
      if (timer) timer.textContent = fmtTime(this.sceneElapsedMs());
    }
    if ((this.flash && Date.now() > this.flash.until) || (this.hintPulse && Date.now() > this.hintPulse.until)) {
      this.flash = null;
      this.hintPulse = null;
      this.requestRender();
    }
  }

  // ---- rendering ---------------------------------------------------------

  requestRender() {
    this.dirty = true;
  }

  loop() {
    const now = Date.now();
    const animating = (this.flash && now < this.flash.until) || (this.hintPulse && now < this.hintPulse.until);
    if (this.dirty || animating) {
      this.render();
      this.dirty = false;
    }
    this._raf = requestAnimationFrame(() => this.loop());
  }

  render() {
    const found = this.found;
    drawScene(this.leftCtx, this.scene, 'left', found, this.latest);
    drawScene(this.rightCtx, this.scene, 'right', found, this.latest);
    this.renderTransient(this.leftCtx);
    this.renderTransient(this.rightCtx);
    this.renderCrosshair(this.leftCtx);
    this.renderCrosshair(this.rightCtx);
  }

  // Wrong-click X and the hint pulse, drawn on both panels alike.
  renderTransient(ctx) {
    const now = Date.now();
    if (this.flash && now < this.flash.until) {
      const { x, y } = this.flash;
      ctx.save();
      ctx.strokeStyle = '#e63b2e';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 16, y - 16); ctx.lineTo(x + 16, y + 16);
      ctx.moveTo(x + 16, y - 16); ctx.lineTo(x - 16, y + 16);
      ctx.stroke();
      ctx.restore();
    }
    if (this.hintPulse && now < this.hintPulse.until) {
      const d = this.hintPulse.diff;
      const pulse = 1 + 0.12 * Math.sin(now / 130);
      ctx.save();
      ctx.strokeStyle = '#2fae5f';
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 9]);
      ctx.beginPath();
      ctx.arc(d.x, d.y, (d.r + 6) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderCrosshair(ctx) {
    if (!this.crosshair.visible) return;
    const { x, y } = this.crosshair;
    ctx.save();
    ctx.strokeStyle = 'rgba(20, 20, 30, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 26, y); ctx.lineTo(x - 10, y);
    ctx.moveTo(x + 10, y); ctx.lineTo(x + 26, y);
    ctx.moveTo(x, y - 26); ctx.lineTo(x, y - 10);
    ctx.moveTo(x, y + 10); ctx.lineTo(x, y + 26);
    ctx.stroke();
    ctx.restore();
  }

  // ---- HUD ---------------------------------------------------------------

  updateHud() {
    const doc = this.doc;
    const scene = this.scene;
    doc.getElementById('scene-label').textContent =
      'Scene ' + (this.sceneIndex + 1) + ' of ' + SCENES.length + ' · Par ' + fmtTime(scene.parSeconds * 1000);
    doc.getElementById('scene-title').textContent = scene.title;
    doc.getElementById('to-find').textContent = this.toFind + ' to find';
    doc.getElementById('timer').textContent = fmtTime(this.sceneElapsedMs());
    doc.getElementById('score').textContent = 'Score ' + this.score;
    doc.getElementById('streak').textContent = this.streak > 1 ? 'Streak ×' + this.streak : '';
    const strikes = doc.getElementById('strikes');
    strikes.textContent = 'Strikes ' + '✕'.repeat(this.strikes) + '·'.repeat(MAX_STRIKES - this.strikes);
    strikes.classList.toggle('danger', this.strikes > 0);
    doc.getElementById('hint-count').textContent = 'Hint (' + this.hintsLeft + ')';
    doc.getElementById('best').textContent = this.save.best > 0 ? 'Best ' + this.save.best : '';
    const dots = doc.getElementById('found-dots');
    dots.innerHTML = '';
    for (const d of scene.diffs) {
      const span = doc.createElement('span');
      span.className = 'dot' + (this.found.has(d.id) ? ' found' : '');
      span.textContent = this.found.has(d.id) ? '✓' : '○';
      span.title = this.found.has(d.id) ? d.label : 'Not found yet';
      dots.appendChild(span);
    }
    const bar = doc.getElementById('progress-bar');
    bar.style.width = Math.round((this.found.size / scene.diffs.length) * 100) + '%';
    const buttons = doc.querySelectorAll('#scene-buttons button');
    buttons.forEach((btn, i) => {
      btn.classList.toggle('active', i === this.sceneIndex);
      btn.disabled = i > this.sceneIndex && !this.save.bestTimes[SCENES[i].id];
    });
    doc.getElementById('pause-btn').textContent = this.paused ? 'Resume' : 'Pause';
    doc.getElementById('mute-btn').textContent = isMuted() ? 'Sound off' : 'Sound on';
  }

  showOverlay(title, text, buttonLabel, onButton) {
    const overlay = this.doc.getElementById('overlay');
    this.doc.getElementById('overlay-title').textContent = title;
    this.doc.getElementById('overlay-text').textContent = text;
    const btn = this.doc.getElementById('overlay-btn');
    btn.textContent = buttonLabel;
    btn.onclick = () => {
      playClick();
      onButton();
    };
    overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.doc.getElementById('overlay').classList.add('hidden');
  }

  persist() {
    try {
      localStorage.setItem(HARBOUR_KEY, JSON.stringify(this.save));
    } catch {
      // Private mode or full storage: the game plays on without saving.
    }
  }

  // ---- input -------------------------------------------------------------

  panelPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * SCENE_W,
      y: ((event.clientY - rect.top) / rect.height) * SCENE_H,
    };
  }

  bindPanels() {
    const doc = this.doc;
    for (const id of ['panel-left', 'panel-right']) {
      const canvas = doc.getElementById(id);
      canvas.addEventListener('click', (event) => {
        const point = this.panelPoint(canvas, event);
        this.guessAt(point.x, point.y);
      });
      canvas.addEventListener('mousemove', (event) => {
        this.crosshair = { ...this.panelPoint(canvas, event), visible: true };
        this.showLens(canvas, event);
        this.requestRender();
      });
      canvas.addEventListener('mouseleave', () => {
        this.crosshair.visible = false;
        this.hideLens();
        this.requestRender();
      });
    }
  }

  // A 2x magnifier that follows the cursor over either panel.
  showLens(canvas, event) {
    const lens = this.doc.getElementById('lens');
    const lensCanvas = this.doc.getElementById('lens-canvas');
    const rect = canvas.getBoundingClientRect();
    const lx = event.clientX - rect.left;
    const ly = event.clientY - rect.top;
    const size = 150;
    const zoom = 2;
    const sx = Math.max(0, Math.min(SCENE_W - size / zoom, (lx / rect.width) * SCENE_W - size / zoom / 2));
    const sy = Math.max(0, Math.min(SCENE_H - size / zoom, (ly / rect.height) * SCENE_H - size / zoom / 2));
    const lctx = lensCanvas.getContext('2d');
    lctx.clearRect(0, 0, size, size);
    lctx.drawImage(canvas, sx, sy, size / zoom, size / zoom, 0, 0, size, size);
    lctx.strokeStyle = 'rgba(232, 169, 28, 0.9)';
    lctx.lineWidth = 3;
    lctx.beginPath(); lctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); lctx.stroke();
    lens.style.left = Math.min(window.innerWidth - size - 12, event.clientX + 18) + 'px';
    lens.style.top = Math.max(12, event.clientY - size - 12) + 'px';
    lens.classList.remove('hidden');
  }

  hideLens() {
    this.doc.getElementById('lens').classList.add('hidden');
  }

  bindHud() {
    const doc = this.doc;
    doc.getElementById('hint-btn').addEventListener('click', () => this.useHint());
    doc.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
    doc.getElementById('mute-btn').addEventListener('click', () => {
      setMuted(!isMuted());
      this.updateHud();
    });
    doc.querySelectorAll('#scene-buttons button').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        playClick();
        this.loadScene(i);
      });
    });
  }

  bindKeyboard() {
    this.doc.addEventListener('keydown', (event) => {
      if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) return;
      const step = event.shiftKey ? 60 : 24;
      const c = this.crosshair;
      switch (event.key) {
        case 'ArrowLeft': c.x = Math.max(0, c.x - step); c.visible = true; this.requestRender(); event.preventDefault(); break;
        case 'ArrowRight': c.x = Math.min(SCENE_W, c.x + step); c.visible = true; this.requestRender(); event.preventDefault(); break;
        case 'ArrowUp': c.y = Math.max(0, c.y - step); c.visible = true; this.requestRender(); event.preventDefault(); break;
        case 'ArrowDown': c.y = Math.min(SCENE_H, c.y + step); c.visible = true; this.requestRender(); event.preventDefault(); break;
        case 'Enter': this.guessAt(c.x, c.y); event.preventDefault(); break;
        case 'h': case 'H': this.useHint(); break;
        case 'p': case 'P': this.togglePause(); break;
        case 'n': case 'N':
          if (this.sceneDone && this.sceneIndex < SCENES.length - 1) this.loadScene(this.sceneIndex + 1);
          break;
        case 'r': case 'R': this.loadScene(this.sceneIndex); break;
        default: break;
      }
    });
  }
}
