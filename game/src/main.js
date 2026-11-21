// main.js — boots "Harbour at Dawn" and exposes a handle for play-testing.
//
// The handle (window.__harbour) lets the screenshot and play-test scripts drive
// the game without a mouse: read the state, guess at scene coordinates, spend a
// hint, pause, and move between scenes. The game itself never calls it.

import { HarbourGame } from './game.js';

const game = new HarbourGame(document);
game.start();

// Play-test handle: state is live, methods act exactly like the player's input.
window.__harbour = {
  game,
  state() {
    return {
      scene: game.sceneIndex,
      title: game.scene.title,
      found: [...game.found],
      toFind: game.toFind,
      strikes: game.strikes,
      hintsLeft: game.hintsLeft,
      score: game.score,
      streak: game.streak,
      paused: game.paused,
      over: game.over,
      sceneDone: game.sceneDone,
      won: game.won,
    };
  },
  guessAt(x, y) {
    return game.guessAt(x, y);
  },
  useHint() {
    return game.useHint();
  },
  togglePause() {
    return game.togglePause();
  },
  nextScene() {
    if (game.sceneIndex < 2) game.loadScene(game.sceneIndex + 1);
  },
  restart() {
    game.restartAll();
  },
};
