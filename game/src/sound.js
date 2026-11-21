// sound.js — tiny WebAudio bleeps for "Harbour at Dawn".
//
// No audio files: every sound is an oscillator envelope built on the fly, so the
// game ships no assets and loads nothing over the network. The context is created
// lazily on the first user gesture (browsers block audio before one).

let audioCtx = null;
let muted = false;

function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function tone(freq, startAt, dur, type, vol) {
  if (muted) return;
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ac.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(vol, ac.currentTime + startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + startAt + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + startAt);
  osc.stop(ac.currentTime + startAt + dur + 0.05);
}

// A happy two-note chime when a difference is found.
export function playFind() {
  tone(880, 0, 0.16, 'sine', 0.22);
  tone(1318.5, 0.09, 0.22, 'sine', 0.18);
}

// A low buzz for a wrong click.
export function playWrong() {
  tone(160, 0, 0.22, 'sawtooth', 0.12);
}

// A soft click for buttons and scene changes.
export function playClick() {
  tone(660, 0, 0.07, 'triangle', 0.12);
}

// A rising arpeggio when a scene is cleared.
export function playSceneClear() {
  tone(523.25, 0, 0.14, 'sine', 0.2);
  tone(659.25, 0.12, 0.14, 'sine', 0.2);
  tone(783.99, 0.24, 0.2, 'sine', 0.2);
  tone(1046.5, 0.36, 0.3, 'sine', 0.2);
}

// A longer fanfare for finishing all three scenes.
export function playWin() {
  playSceneClear();
  tone(1318.5, 0.6, 0.22, 'sine', 0.18);
  tone(1568, 0.72, 0.34, 'sine', 0.18);
}

export function setMuted(value) {
  muted = !!value;
}

export function isMuted() {
  return muted;
}
