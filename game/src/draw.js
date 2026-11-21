// draw.js — the flat-vector harbour renderer.
//
// drawScene(ctx, scene, side) paints one panel of a scene on a 2D canvas context.
// side is 'left' (the original) or 'right' (the same scene with every difference
// applied). All art is code: no images, no network, no randomness — the two panels
// differ only where a difference says so, which is what makes the hunt fair.
//
// The scene space is 1000 x 750. Canvases are sized to that space, so a scene
// point (x, y) maps to canvas pixels 1:1 and hit circles match what is drawn.

import { SCENE_W, SCENE_H } from './scenes.js';

// Modifications a difference applies to its target shape, keyed by difference id.
function modsFor(scene, side) {
  const map = new Map();
  if (side !== 'right') return map;
  for (const d of scene.diffs) {
    if (d.kind === 'removed') map.set(d.target, { remove: true });
    else if (d.kind === 'added') continue;
    else map.set(d.target, d.mod || {});
  }
  return map;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function drawShape(ctx, s, mods) {
  if (mods && mods.remove) return;
  const m = mods ? { ...s, ...mods } : s;
  ctx.save();
  if (m.flip) {
    ctx.translate(2 * m.x, 0);
    ctx.scale(-1, 1);
  }
  if (m.dx !== undefined || m.dy !== undefined) {
    ctx.translate(m.dx || 0, m.dy || 0);
  }
  const sc = m.scale || 1;
  if (sc !== 1 && m.x !== undefined) {
    ctx.translate(m.x, m.y);
    ctx.scale(sc, sc);
    ctx.translate(-m.x, -m.y);
  }
  switch (m.type) {
    case 'sky': {
      const g = ctx.createLinearGradient(0, 0, 0, 470);
      g.addColorStop(0, m.top); g.addColorStop(0.55, m.mid); g.addColorStop(1, m.bot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SCENE_W, 470);
      break;
    }
    case 'sun': {
      ctx.fillStyle = 'rgba(255, 243, 176, 0.35)';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = m.color;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'cloud': {
      ctx.fillStyle = m.color;
      ellipse(ctx, m.x, m.y, 52 * m.s, 22 * m.s); ctx.fill();
      ellipse(ctx, m.x - 34 * m.s, m.y + 8 * m.s, 34 * m.s, 16 * m.s); ctx.fill();
      ellipse(ctx, m.x + 36 * m.s, m.y + 8 * m.s, 36 * m.s, 17 * m.s); ctx.fill();
      break;
    }
    case 'sea': {
      const g = ctx.createLinearGradient(0, 470, 0, 670);
      g.addColorStop(0, m.top); g.addColorStop(1, m.bot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 470, SCENE_W, 200);
      break;
    }
    case 'wave': {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x - m.w / 2, m.y);
      ctx.quadraticCurveTo(m.x - m.w / 4, m.y - 14, m.x, m.y);
      ctx.quadraticCurveTo(m.x + m.w / 4, m.y + 14, m.x + m.w / 2, m.y);
      ctx.stroke();
      break;
    }
    case 'sand': {
      ctx.fillStyle = m.color;
      ctx.fillRect(0, 670, SCENE_W, 80);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 9; i++) {
        ellipse(ctx, 60 + i * 110, 712 + (i % 3) * 12, 26, 5);
        ctx.fill();
      }
      break;
    }
    case 'lighthouse': {
      const x = m.x, base = m.y, h = m.h, wTop = 34, wBot = 56;
      ctx.fillStyle = '#fdf6e3';
      ctx.beginPath();
      ctx.moveTo(x - wBot / 2, base); ctx.lineTo(x - wTop / 2, base - h);
      ctx.lineTo(x + wTop / 2, base - h); ctx.lineTo(x + wBot / 2, base);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = m.stripe;
      ctx.fillRect(x - wBot / 2 + 3, base - h * 0.62, wBot - 6, 26);
      ctx.fillRect(x - wTop / 2 - 2, base - h * 0.34, wTop + 4, 24);
      ctx.fillStyle = '#2d2a26';
      ctx.fillRect(x - 26, base - h - 26, 52, 26);
      ctx.fillStyle = m.lamp;
      ctx.fillRect(x - 16, base - h - 22, 32, 18);
      ctx.fillStyle = 'rgba(255, 217, 77, 0.25)';
      ctx.beginPath();
      ctx.moveTo(x, base - h - 12);
      ctx.lineTo(x + 130, base - h - 70); ctx.lineTo(x + 130, base - h + 30);
      ctx.closePath(); ctx.fill();
      if (m.window) {
        ctx.fillStyle = '#2d2a26';
        ctx.beginPath(); ctx.arc(x, base - h * 0.5, 9, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'house': {
      const win = (m.win || 1);
      ctx.fillStyle = m.wall;
      ctx.fillRect(m.x, m.y, m.w, m.h);
      ctx.fillStyle = m.roof;
      ctx.beginPath();
      ctx.moveTo(m.x - 8, m.y); ctx.lineTo(m.x + m.w / 2, m.y - 34); ctx.lineTo(m.x + m.w + 8, m.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2d2a26';
      const ww = 16 * win, wh = 18 * win;
      ctx.fillRect(m.x + m.w / 2 - ww / 2, m.y + m.h / 2 - wh / 2, ww, wh);
      ctx.fillStyle = '#ffd94d';
      ctx.fillRect(m.x + m.w / 2 - ww / 2 + 2, m.y + m.h / 2 - wh / 2 + 2, ww - 4, wh - 4);
      break;
    }
    case 'boat': {
      const s = m.s;
      ctx.strokeStyle = '#5d3a24'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(m.x, m.y - 62 * s); ctx.lineTo(m.x, m.y); ctx.stroke();
      ctx.fillStyle = m.sail;
      ctx.beginPath();
      ctx.moveTo(m.x + 4, m.y - 58 * s); ctx.lineTo(m.x + 4, m.y - 6 * s); ctx.lineTo(m.x + 46 * s, m.y - 6 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = m.hull;
      ctx.beginPath();
      ctx.moveTo(m.x - 52 * s, m.y); ctx.lineTo(m.x + 56 * s, m.y);
      ctx.lineTo(m.x + 40 * s, m.y + 22 * s); ctx.lineTo(m.x - 38 * s, m.y + 22 * s);
      ctx.closePath(); ctx.fill();
      const stripeH = 6 * (m.hullStripe || 1);
      ctx.fillStyle = '#ffd94d';
      ctx.fillRect(m.x - 44 * s, m.y + 4, 88 * s, stripeH);
      break;
    }
    case 'bird': {
      ctx.strokeStyle = '#3a3230'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x - 16 * m.s, m.y);
      ctx.quadraticCurveTo(m.x - 6 * m.s, m.y - 12 * m.s, m.x, m.y);
      ctx.quadraticCurveTo(m.x + 6 * m.s, m.y - 12 * m.s, m.x + 16 * m.s, m.y);
      ctx.stroke();
      break;
    }
    case 'buoy': {
      const s = m.s;
      ctx.fillStyle = '#d94f3d';
      ctx.beginPath();
      ctx.moveTo(m.x - 20 * s, m.y + 14 * s); ctx.lineTo(m.x + 20 * s, m.y + 14 * s);
      ctx.lineTo(m.x + 8 * s, m.y - 22 * s); ctx.lineTo(m.x - 8 * s, m.y - 22 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = m.band || '#fdf6e3';
      ctx.fillRect(m.x - 14 * s, m.y - 2 * s, 28 * s, 10 * s);
      ctx.fillStyle = '#2d2a26';
      ctx.fillRect(m.x - 3 * s, m.y - 30 * s, 6 * s, 9 * s);
      break;
    }
    case 'pier': {
      ctx.fillStyle = '#8a5a33';
      ctx.fillRect(0, m.y, SCENE_W, 130);
      ctx.fillStyle = '#a8763f';
      for (let x = 0; x < SCENE_W; x += 64) ctx.fillRect(x + 4, m.y, 56, 130);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let x = 0; x < SCENE_W; x += 64) ctx.fillRect(x, m.y, 3, 130);
      break;
    }
    case 'flag': {
      ctx.strokeStyle = '#5d3a24'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(m.x, m.y - 34); ctx.lineTo(m.x, m.y + 14); ctx.stroke();
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - 34); ctx.lineTo(m.x + 34, m.y - 24); ctx.lineTo(m.x, m.y - 14);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'crate': {
      const s = m.s;
      ctx.fillStyle = '#b5813f';
      ctx.fillRect(m.x - 24 * s, m.y - 24 * s, 48 * s, 48 * s);
      ctx.strokeStyle = '#8a5a33'; ctx.lineWidth = 3;
      ctx.strokeRect(m.x - 24 * s, m.y - 24 * s, 48 * s, 48 * s);
      ctx.beginPath();
      ctx.moveTo(m.x - 24 * s, m.y - 24 * s); ctx.lineTo(m.x + 24 * s, m.y + 24 * s);
      ctx.moveTo(m.x + 24 * s, m.y - 24 * s); ctx.lineTo(m.x - 24 * s, m.y + 24 * s);
      ctx.stroke();
      break;
    }
    case 'barrel': {
      const s = m.s;
      ctx.fillStyle = '#7a4a26';
      roundRect(ctx, m.x - 18 * s, m.y - 24 * s, 36 * s, 48 * s, 8 * s); ctx.fill();
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(m.x - 18 * s, m.y - 12 * s, 36 * s, 5 * s);
      ctx.fillRect(m.x - 18 * s, m.y + 8 * s, 36 * s, 5 * s);
      break;
    }
    case 'rope': {
      ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(m.x, m.y - i * 7, 30 - i * 6, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'anchor': {
      const s = m.s;
      ctx.strokeStyle = '#2d2a26'; ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(m.x, m.y - 26 * s, 10 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m.x, m.y - 16 * s); ctx.lineTo(m.x, m.y + 22 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m.x - 22 * s, m.y - 8 * s); ctx.lineTo(m.x + 22 * s, m.y - 8 * s); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(m.x - 24 * s, m.y + 2 * s);
      ctx.quadraticCurveTo(m.x - 24 * s, m.y + 28 * s, m.x, m.y + 24 * s);
      ctx.quadraticCurveTo(m.x + 24 * s, m.y + 28 * s, m.x + 24 * s, m.y + 2 * s);
      ctx.stroke();
      break;
    }
    case 'fish': {
      const s = m.s;
      ctx.fillStyle = '#e8f4f4';
      ctx.beginPath();
      ctx.moveTo(m.x - 20 * s, m.y);
      ctx.quadraticCurveTo(m.x, m.y - 16 * s, m.x + 20 * s, m.y);
      ctx.quadraticCurveTo(m.x, m.y + 16 * s, m.x - 20 * s, m.y);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(m.x + 18 * s, m.y); ctx.lineTo(m.x + 30 * s, m.y - 10 * s); ctx.lineTo(m.x + 30 * s, m.y + 10 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2d2a26';
      ctx.beginPath(); ctx.arc(m.x - 8 * s, m.y - 3 * s, 2.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'net': {
      const s = m.s;
      ctx.strokeStyle = 'rgba(240,230,200,0.9)'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(m.x - 34 * s + i * 18 * s, m.y - 20 * s);
        ctx.lineTo(m.x - 22 * s + i * 18 * s, m.y + 22 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(m.x + 34 * s - i * 18 * s, m.y - 20 * s);
        ctx.lineTo(m.x + 22 * s - i * 18 * s, m.y + 22 * s);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(m.x - 36 * s, m.y - 20 * s); ctx.lineTo(m.x + 36 * s, m.y - 20 * s);
      ctx.stroke();
      break;
    }
    case 'roundwin': {
      ctx.fillStyle = '#2d2a26';
      ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// Paint one panel. `found` is a Set of difference ids to ring in gold;
// `latest` is the most recent find, rung in green instead.
export function drawScene(ctx, scene, side, found, latest) {
  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  const mods = modsFor(scene, side);
  for (const shape of scene.shapes) drawShape(ctx, shape, mods.get(shape.id));
  if (side === 'right') {
    for (const d of scene.diffs) {
      if (d.kind === 'added' && d.extra) drawShape(ctx, d.extra, null);
    }
  }
  // Rings on every found difference, on both panels alike.
  for (const d of scene.diffs) {
    if (!found.has(d.id)) continue;
    const isLatest = d.id === latest;
    ctx.save();
    ctx.strokeStyle = isLatest ? '#2fae5f' : '#e8a91c';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 9, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}
