// scenes.js — the three harbour scenes of "Harbour at Dawn".
//
// Every shape the renderer draws lives here, in a fixed 1000 x 750 scene space,
// and every difference is a fair change to one of those shapes: removed, recoloured,
// moved, resized, flipped, or added. Nothing here is random, so the two panels
// render identically on every run and every load.
//
// A difference: { id, x, y, r, kind, target, mod, extra }
//   x, y, r — the hit circle in scene coordinates (the player clicks inside it)
//   kind   — removed | recoloured | moved | resized | flipped | added
//   target — the id of the shape it changes (null for added)
//   mod    — fields merged over the shape when the right panel is drawn
//   extra  — a whole shape drawn only on the right panel (kind "added")

export const SCENE_W = 1000;
export const SCENE_H = 750;

export const SCENES = [
  {
    id: 'dawn',
    title: 'The Harbour at Dawn',
    subtitle: 'Sunrise over the fishing harbour',
    parSeconds: 120,
    shapes: [
      { id: 'sky', type: 'sky', top: '#ffd9a0', mid: '#ff9e7d', bot: '#f97b6b' },
      { id: 'sun', type: 'sun', x: 820, y: 118, r: 56, color: '#fff3b0' },
      { id: 'cloud-a', type: 'cloud', x: 180, y: 92, s: 1.0, color: '#fff6e8' },
      { id: 'cloud-b', type: 'cloud', x: 520, y: 66, s: 0.8, color: '#fff6e8' },
      { id: 'cloud-c', type: 'cloud', x: 700, y: 186, s: 0.65, color: '#ffe9d2' },
      { id: 'sea', type: 'sea', top: '#2a9d8f', bot: '#1d7a6e' },
      { id: 'wave-a', type: 'wave', x: 240, y: 520, w: 120 },
      { id: 'wave-b', type: 'wave', x: 620, y: 560, w: 150 },
      { id: 'wave-c', type: 'wave', x: 880, y: 520, w: 90 },
      { id: 'house-a', type: 'house', x: 300, y: 560, w: 92, h: 76, roof: '#c94f3d', wall: '#ffe9c4', win: 1 },
      { id: 'house-b', type: 'house', x: 428, y: 578, w: 84, h: 66, roof: '#3d6e9e', wall: '#fff3d6', win: 1 },
      { id: 'house-c', type: 'house', x: 596, y: 566, w: 78, h: 70, roof: '#c98a3d', wall: '#ffe9c4', win: 1 },
      { id: 'light', type: 'lighthouse', x: 108, y: 668, h: 258, stripe: '#d94f3d', lamp: '#ffd94d' },
      { id: 'boat-a', type: 'boat', x: 700, y: 528, s: 1.0, sail: '#fff8e6', hull: '#8a4b2d' },
      { id: 'boat-b', type: 'boat', x: 186, y: 548, s: 0.72, sail: '#ffe9a8', hull: '#5d3a24' },
      { id: 'buoy', type: 'buoy', x: 878, y: 606, s: 1.0, band: '#fdf6e3' },
      { id: 'bird-a', type: 'bird', x: 350, y: 150, s: 1.0 },
      { id: 'bird-b', type: 'bird', x: 420, y: 118, s: 0.8 },
      { id: 'bird-c', type: 'bird', x: 620, y: 210, s: 0.9 },
      { id: 'sand', type: 'sand', color: '#f2d8a7' },
    ],
    diffs: [
      { id: 'd1', x: 820, y: 118, r: 62, kind: 'removed', target: 'sun', label: 'the sun is gone' },
      { id: 'd2', x: 520, y: 66, r: 52, kind: 'recoloured', target: 'cloud-b', mod: { color: '#f2a0b5' }, label: 'a cloud turned pink' },
      { id: 'd3', x: 108, y: 520, r: 48, kind: 'recoloured', target: 'light', mod: { stripe: '#2a9d8f' }, label: 'a lighthouse stripe turned teal' },
      { id: 'd4', x: 186, y: 548, r: 66, kind: 'moved', target: 'boat-b', mod: { dx: 58, dy: -14 }, label: 'the small boat drifted' },
      { id: 'd5', x: 652, y: 148, r: 46, kind: 'added', target: null, extra: { id: 'bird-new', type: 'bird', x: 652, y: 148, s: 1.0 }, label: 'an extra bird appeared' },
      { id: 'd6', x: 448, y: 606, r: 44, kind: 'resized', target: 'house-b', mod: { win: 1.9 }, label: 'a window grew bigger' },
      { id: 'd7', x: 878, y: 606, r: 50, kind: 'recoloured', target: 'buoy', mod: { band: '#2a9d8f' }, label: 'the buoy band turned teal' },
    ],
  },
  {
    id: 'pier',
    title: 'The Lighthouse Pier',
    subtitle: 'Dusk on the old wooden pier',
    parSeconds: 150,
    shapes: [
      { id: 'sky', type: 'sky', top: '#f7c873', mid: '#ef8f6b', bot: '#b65c7a' },
      { id: 'sun', type: 'sun', x: 140, y: 150, r: 44, color: '#fff0b8' },
      { id: 'cloud-a', type: 'cloud', x: 640, y: 84, s: 0.9, color: '#ffe9d2' },
      { id: 'cloud-b', type: 'cloud', x: 850, y: 150, s: 0.7, color: '#fff6e8' },
      { id: 'sea', type: 'sea', top: '#2a7f8f', bot: '#1d5a6e' },
      { id: 'wave-a', type: 'wave', x: 300, y: 470, w: 130 },
      { id: 'wave-b', type: 'wave', x: 760, y: 500, w: 110 },
      { id: 'light', type: 'lighthouse', x: 500, y: 668, h: 300, stripe: '#3d6e9e', lamp: '#ffd94d' },
      { id: 'flag', type: 'flag', x: 500, y: 340, color: '#d94f3d' },
      { id: 'pier', type: 'pier', y: 620 },
      { id: 'crate-a', type: 'crate', x: 300, y: 600, s: 1.0 },
      { id: 'crate-b', type: 'crate', x: 690, y: 606, s: 0.85 },
      { id: 'barrel', type: 'barrel', x: 610, y: 612, s: 1.0 },
      { id: 'rope', type: 'rope', x: 210, y: 632, s: 1.0 },
      { id: 'anchor', type: 'anchor', x: 800, y: 640, s: 1.0 },
      { id: 'gull-a', type: 'bird', x: 250, y: 130, s: 1.0 },
      { id: 'gull-b', type: 'bird', x: 760, y: 220, s: 0.85 },
      { id: 'gull-c', type: 'bird', x: 330, y: 220, s: 0.75 },
      { id: 'sand', type: 'sand', color: '#e8c890' },
    ],
    diffs: [
      { id: 'd1', x: 500, y: 340, r: 44, kind: 'removed', target: 'flag', label: 'the flag is gone' },
      { id: 'd2', x: 500, y: 396, r: 42, kind: 'recoloured', target: 'light', mod: { lamp: '#7db8e8' }, label: 'the lamp turned blue' },
      { id: 'd3', x: 420, y: 610, r: 46, kind: 'added', target: null, extra: { id: 'crate-new', type: 'crate', x: 420, y: 610, s: 0.9 }, label: 'an extra crate appeared' },
      { id: 'd4', x: 760, y: 220, r: 44, kind: 'removed', target: 'gull-b', label: 'a gull flew away' },
      { id: 'd5', x: 210, y: 632, r: 70, kind: 'moved', target: 'rope', mod: { dx: 64, dy: 0 }, label: 'the rope coil slid along' },
      { id: 'd6', x: 500, y: 500, r: 40, kind: 'added', target: null, extra: { id: 'win-new', type: 'roundwin', x: 500, y: 500 }, label: 'a round window appeared' },
      { id: 'd7', x: 800, y: 640, r: 52, kind: 'resized', target: 'anchor', mod: { scale: 1.6 }, label: 'the anchor grew bigger' },
    ],
  },
  {
    id: 'boats',
    title: 'The Fishing Boats',
    subtitle: 'Three boats out before breakfast',
    parSeconds: 180,
    shapes: [
      { id: 'sky', type: 'sky', top: '#ffe3b3', mid: '#ffb08a', bot: '#f2836b' },
      { id: 'sun', type: 'sun', x: 500, y: 96, r: 48, color: '#fff3b0' },
      { id: 'cloud-a', type: 'cloud', x: 200, y: 80, s: 0.9, color: '#fff6e8' },
      { id: 'cloud-b', type: 'cloud', x: 780, y: 130, s: 0.75, color: '#ffe9d2' },
      { id: 'sea', type: 'sea', top: '#2a9d8f', bot: '#1d6e66' },
      { id: 'wave-a', type: 'wave', x: 180, y: 540, w: 120 },
      { id: 'wave-b', type: 'wave', x: 560, y: 580, w: 140 },
      { id: 'wave-c', type: 'wave', x: 860, y: 540, w: 100 },
      { id: 'boat-a', type: 'boat', x: 210, y: 560, s: 1.1, sail: '#fff8e6', hull: '#a8542f' },
      { id: 'boat-b', type: 'boat', x: 500, y: 520, s: 1.25, sail: '#fff8e6', hull: '#3d6e9e' },
      { id: 'boat-c', type: 'boat', x: 800, y: 566, s: 0.95, sail: '#ffe9a8', hull: '#5d3a24' },
      { id: 'flag-a', type: 'flag', x: 210, y: 420, color: '#d94f3d' },
      { id: 'flag-b', type: 'flag', x: 500, y: 380, color: '#2a9d8f' },
      { id: 'fish-a', type: 'fish', x: 350, y: 600, s: 1.0 },
      { id: 'fish-b', type: 'fish', x: 660, y: 620, s: 0.85 },
      { id: 'barrel', type: 'barrel', x: 120, y: 660, s: 1.0 },
      { id: 'gull-a', type: 'bird', x: 300, y: 170, s: 0.9 },
      { id: 'gull-b', type: 'bird', x: 700, y: 240, s: 1.0 },
      { id: 'sand', type: 'sand', color: '#f2d8a7' },
    ],
    diffs: [
      { id: 'd1', x: 500, y: 470, r: 52, kind: 'recoloured', target: 'boat-b', mod: { sail: '#e85d4d' }, label: 'the middle sail turned red' },
      { id: 'd2', x: 350, y: 600, r: 44, kind: 'removed', target: 'fish-a', label: 'a jumping fish is gone' },
      { id: 'd3', x: 120, y: 660, r: 76, kind: 'moved', target: 'barrel', mod: { dx: 70, dy: -8 }, label: 'the barrel rolled along' },
      { id: 'd4', x: 800, y: 520, r: 48, kind: 'added', target: null, extra: { id: 'net-new', type: 'net', x: 800, y: 520, s: 1.0 }, label: 'a fishing net appeared' },
      { id: 'd5', x: 500, y: 380, r: 42, kind: 'flipped', target: 'flag-b', mod: { flip: true }, label: 'the teal flag flipped' },
      { id: 'd6', x: 880, y: 200, r: 46, kind: 'added', target: null, extra: { id: 'gull-new', type: 'bird', x: 880, y: 200, s: 0.9 }, label: 'an extra gull appeared' },
      { id: 'd7', x: 210, y: 590, r: 48, kind: 'resized', target: 'boat-a', mod: { hullStripe: 2.2 }, label: 'the first boat’s stripe grew wide' },
    ],
  },
];

// Find the difference whose hit circle contains scene point (x, y), or null.
export function diffAt(scene, x, y) {
  for (const d of scene.diffs) {
    const dx = x - d.x, dy = y - d.y;
    if (dx * dx + dy * dy <= d.r * d.r) return d;
  }
  return null;
}
