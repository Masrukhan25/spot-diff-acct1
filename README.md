# Harbour at Dawn — Spot the Difference

[![make.fun](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/Masrukhan25/spot-diff-acct1/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/Masrukhan25/spot-diff-acct1/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)

A complete, original spot-the-difference game that plays offline in a desktop
browser from its own files. Three hand-drawn harbour scenes — dawn, the pier,
the fishing boats — each hiding seven fair differences: removed, recoloured,
moved, resized, flipped, or added. All art is flat vector drawn by code on a
Canvas 2D surface; no images, no network, no library.

Two panels sit side by side (Original vs Spot the changes). Click a difference
in either panel and it is ringed in gold on both; the newest find rings green.
A wrong click costs a strike — three strikes end the scene. Hints (3 per scene)
pulse a green dashed ring around one difference you have not found yet. A
magnifier follows your cursor, the keyboard drives a crosshair (arrows + Enter,
H for hint, P pause, N next, R restart), and WebAudio bleeps mark every find.
Each scene has its own par time; clearing it earns a time bonus, and the best
score is kept in localStorage.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library. The output is deterministic:
two runs write the same bytes.
