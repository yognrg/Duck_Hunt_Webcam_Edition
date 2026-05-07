# Duck Hunt — Webcam Edition

A viral-ready, retro-meets-futuristic Duck Hunt game controlled entirely by real webcam hand gestures via MediaPipe AI hand tracking. No mouse, no cursor — your index finger IS the gun.

## Run & Operate

- `pnpm --filter @workspace/duck-hunt run dev` — run the game (frontend only, no backend needed)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS
- Hand Tracking: @mediapipe/tasks-vision (HandLandmarker, GPU delegate)
- Animations: Framer Motion
- Audio: Web Audio API (synthesized, no audio files)
- Build: Vite (static output)

## Where things live

- `artifacts/duck-hunt/src/pages/Game.tsx` — main game component: webcam, MediaPipe, canvas game loop, gesture detection
- `artifacts/duck-hunt/src/App.tsx` — minimal wrapper
- `artifacts/duck-hunt/src/index.css` — dark gaming theme

## Architecture decisions

- MediaPipe HandLandmarker runs in VIDEO mode using `detectForVideo` in a rAF loop
- WASM runtime loaded from CDN (cdn.jsdelivr.net), model from Google Cloud Storage
- Guard: `readyState >= 2 && videoWidth > 0 && videoHeight > 0` before calling detectForVideo prevents MediaPipe ROI crash on unloaded video
- Crosshair position is 100% from landmark[8] (index fingertip), mirrored horizontally
- Web Audio API synthesizes all sounds; no external audio files needed
- Single canvas for game world + AR overlay rendering

## Product

Duck Hunt game with real webcam hand tracking:
- Point index finger to aim (crosshair follows landmark 8)
- Pinch thumb+index to shoot
- Retro NES art: pixel ducks, green grass, blue sky, chunky dog
- Futuristic overlay: skeletal hand tracking, AI scan pulse, gesture confidence HUD
- Webcam preview in top-right (FaceTime style) with live skeleton overlay
- Score, high score, rounds, miss counter
- Web Audio sound effects

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- MediaPipe WASM + model loads from CDN on first run — expect ~2-3s init time
- Preview environment has no webcam, so it shows "INITIALIZING CAMERA SYSTEM" — works correctly with a real webcam
- Always guard `detectForVideo` with `readyState >= 2 && videoWidth > 0` check

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
