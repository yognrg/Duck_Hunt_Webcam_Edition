import React, { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ──────────────────────────────────────────────────────────────
// A "slot" is how many ducks fly per round; the player picks it on the start screen.
const SLOT_OPTIONS = [5, 10, 15] as const;
const TOTAL_ROUNDS = 5;
const DOG_SHOW_MS = 2800; // how long the dog stays up before the round summary
const bulletsFor = (slot: number) => slot * 2;
const spawnIntervalFor = (round: number) => Math.max(1500, 4000 - round * 300);
// enough time for every duck in the slot to cross the screen, plus a margin
const roundSecondsFor = (slot: number, round: number) => Math.ceil((slot * spawnIntervalFor(round)) / 1000 + 12);

// ── Types ──────────────────────────────────────────────────────────────────
type GameState = "START" | "PLAYING" | "DOG" | "ROUND_END" | "GAME_OVER";

interface Pt { x: number; y: number; z?: number; }

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; color: string; size: number;
}

interface Duck {
  id: number; x: number; y: number; vx: number; vy: number;
  state: "FLYING" | "HIT" | "FALLING" | "ESCAPING";
  w: number; h: number; frame: number; shotsFired: number;
}

// ── Audio ──────────────────────────────────────────────────────────────────
class AudioSynth {
  private ctx: AudioContext | null = null;
  init() { if (!this.ctx) this.ctx = new AudioContext(); }

  private tone(type: OscillatorType, freq: number, freqEnd: number, dur: number, vol = 0.3) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.connect(g); g.connect(this.ctx.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  shoot()    { this.tone("square",  800,  100, 0.10); }
  hit()      { this.tone("square", 1200,  400, 0.30); }
  miss()     { this.tone("sawtooth", 150,  50, 0.20, 0.5); }
  flap()     { this.tone("sine",    300,  200, 0.10, 0.05); }
  dogLaugh() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.connect(g); g.connect(this.ctx.destination);
    o.type = "square";
    for (let i = 0; i < 4; i++) {
      o.frequency.setValueAtTime(400, this.ctx.currentTime + i * 0.15);
      o.frequency.setValueAtTime(550, this.ctx.currentTime + i * 0.15 + 0.07);
      g.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.15);
      g.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.15 + 0.13);
    }
    o.start(); o.stop(this.ctx.currentTime + 0.7);
  }
}

const audio = new AudioSynth();

// ── Helpers ────────────────────────────────────────────────────────────────
const DUCK_COLORS = ["#8B4513", "#556B2F", "#8B008B", "#B8860B"];

function spawnDuck(canvas: HTMLCanvasElement, round: number, speedMult: number): Duck {
  const fromLeft = Math.random() > 0.5;
  // Base speed is gentle; round adds a small bump; speedMult scales the whole thing
  const speed = (1.4 + round * 0.2) * speedMult;
  return {
    id: Math.random(),
    x: fromLeft ? -70 : canvas.width + 70,
    y: canvas.height * 0.18 + Math.random() * canvas.height * 0.48,
    vx: (fromLeft ? 1 : -1) * speed,
    vy: (Math.random() - 0.5) * 1.2,
    state: "FLYING",
    w: 80, h: 56,   // matches the 80x55 sprite; generous hitbox
    frame: 0,
    shotsFired: 0,
  };
}

// ── Pixel art ──────────────────────────────────────────────────────────────
// Sprites are rows of palette keys ("." is transparent), drawn as chunky pixels.
const PAL: Record<string, string> = {
  k: "#000000", w: "#FCFCFC", g: "#00A844", G: "#005800", o: "#FC9838",
  y: "#F8D878", b: "#A85C2C", B: "#503000", R: "#D82800", n: "#FCBCB0", u: "#0058F8",
};

function sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, px: number, flip = false) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === ".") continue;
      ctx.fillStyle = PAL[c];
      const xi = flip ? row.length - 1 - i : i;
      ctx.fillRect(Math.round(x + xi * px), Math.round(y + j * px), px, px);
    }
  }
}

const DUCK_SPRITES = {
  up: [
    "..kk............",
    "..kkk...........",
    "...kkk......ggg.",
    "....kkkk...gggg.",
    ".....kkkk..gwkgo",
    "......kkkkkgggoo",
    "...kkkkkkkkkgg..",
    "..kkkkkkwwkkk...",
    "...kkkkkkkkkk...",
    ".....kkkkkkk....",
    "......oo..oo....",
  ],
  down: [
    "................",
    "............ggg.",
    "...........gggg.",
    "...........gwkgo",
    "..kkkkkkkkkgggoo",
    ".kkkkkkkwwkkgg..",
    "..kkkkkkkkkkk...",
    "...kkkkkkkkk....",
    "....kkkk........",
    "...kkk..oo..oo..",
    "..kk............",
  ],
  hit: [
    "....ggg.........",
    "...gggg..k...k..",
    "...gkkgo..k.k...",
    "...ggggoo..k....",
    "....kkkk..k.k...",
    "..kkkkkkkk...k..",
    ".kkkkwwkkkk.....",
    ".kkkkkkkkkk.....",
    "..kkkkkkkk......",
    "....o..o........",
  ],
  fall: [
    "......o..o......",
    "....kkkkkkkk....",
    "...kkkkkkkkkk...",
    "...kkkwwkkkkk...",
    "....kkkkkkkk....",
    ".....kkkkkk.....",
    "......gggg......",
    ".....ggwkgg.....",
    "......gggo......",
    ".......oo.......",
  ],
};
const DUCK_PX = 5; // 16x11 sprite → 80x55 on screen

function drawDuck(ctx: CanvasRenderingContext2D, duck: Duck) {
  const flip = duck.vx < 0;
  let rows = duck.frame % 16 < 8 ? DUCK_SPRITES.up : DUCK_SPRITES.down;
  if (duck.state === "HIT") rows = DUCK_SPRITES.hit;
  if (duck.state === "FALLING") rows = DUCK_SPRITES.fall;
  const fallFlip = duck.state === "FALLING" ? Math.floor(duck.frame / 5) % 2 === 0 : flip;
  sprite(ctx, rows, duck.x - 8 * DUCK_PX, duck.y - 6 * DUCK_PX, DUCK_PX, fallFlip);
}

// The dog: a long-eared hound that pops out of the grass when the slot is over.
const DOG_HAPPY = [
  "......BB..........BB......",
  ".....BBbB........BbBB.....",
  "....BBbbB.yyyyyy.BbbBB....",
  "....BbbbByyyyyyyyBbbbB....",
  "....BbbBByywwyywwyBbbB....",
  "....BbbB.yywkyywkyBbbB....",
  "....BbB..yyyyyyyyy.BbB....",
  ".....B...yyyykkyyy..B.....",
  ".........yyykkkkyy........",
  ".........yyRRRRRyy........",
  "..........yyRnnRyy........",
  "...........yyyyyy.........",
  "..........bbbbbbbb........",
  ".........bbbbyybbbb.......",
  "........bbbbyyyybbbb......",
  "........bbbyyyyyybbb......",
  "........bbbyyyyyybbb......",
  "........bbbyyyyyybbb......",
  "........bbbyyyyyybbb......",
];
const DOG_NERVOUS = [
  "......BB..........BB......",
  ".....BBbB........BbBB.....",
  "....BBbbB.yyyyyy.BbbBB....",
  "....BbbbByyyyyyyyBbbbB....",
  "....BbbBBywwwyywwwBbbB....",
  "....BbbB.ywkwyywkwBbbB....",
  "....BbB..yywyyyywyy.BbB...",
  ".....B...yyyykkyyy..B.....",
  ".........yyykkkkyy........",
  ".........yykyykyky........",
  ".........yyykkyykk........",
  "...........yyyyyy.........",
  "..........bbbbbbbb........",
  ".........bbbbyybbbb.......",
  "........bbbbyyyybbbb......",
  "........bbbyyyyyybbb......",
  "........bbbyyyyyybbb......",
  "........bbbyyyyyybbb......",
  "........bbbyyyyyybbb......",
];
const PAW = ["..yy..", ".yyyy.", ".yyyy.", "..yy.."];
const SWEAT = [".w.", "wuw", "wuw", ".w."];
const DOG_PX = 5;

/** Draws the dog with its top at `top`; happy dogs hold up to two ducks, nervous ones shake and sweat. */
function drawDog(ctx: CanvasRenderingContext2D, cx: number, top: number, hits: number, t: number) {
  const P = DOG_PX;
  const w = 26 * P;
  if (hits === 0) {
    const x = cx - w / 2 + Math.round(Math.sin(t / 25) * 2);
    sprite(ctx, DOG_NERVOUS, x, top, P);
    if (Math.floor(t / 330) % 2 === 0) sprite(ctx, SWEAT, x + 2 * P, top + 4 * P, P);
    else sprite(ctx, SWEAT, x + 23 * P, top + 6 * P, P);
    sprite(ctx, PAW, x + 3 * P, top + 12 * P, P);
    sprite(ctx, PAW, x + 17 * P, top + 12 * P, P);
    return;
  }
  const x = cx - w / 2;
  const spots = hits === 1 ? [x + 20 * P] : [x - 7 * P, x + 20 * P];
  // arms first so the face stays on top
  for (const hx of spots) {
    ctx.fillStyle = PAL.y; ctx.fillRect(hx + 6 * P, top - P, 4 * P, 15 * P);
    ctx.fillStyle = PAL.b; ctx.fillRect(hx + 6 * P, top - P, P, 15 * P);
  }
  sprite(ctx, DOG_HAPPY, x, top, P);
  for (const hx of spots) {
    sprite(ctx, PAW, hx + 5 * P, top - 4 * P, P);
    sprite(ctx, DUCK_SPRITES.fall, hx, top - 14 * P, P);
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Game() {
  // React state — only for UI overlays (never read by game loop)
  const [uiState, setUiState] = useState<GameState>("START");
  const [hasWebcam, setHasWebcam] = useState(false);
  const [uiConfidence, setUiConfidence] = useState(0);
  const [uiAiming, setUiAiming] = useState(false);
  const [uiShooting, setUiShooting] = useState(false);
  const [uiRoundSummary, setUiRoundSummary] = useState({ round: 1, hits: 0, score: 0 });
  const [speedLabel, setSpeedLabel] = useState<"SLOW" | "NORMAL" | "FAST">("NORMAL");
  const [slotLabel, setSlotLabel] = useState<number>(10);

  // DOM refs
  const videoRef      = useRef<HTMLVideoElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef    = useRef<HTMLCanvasElement>(null);

  // MediaPipe
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  // ── All game state as refs — no React re-renders from game loop ──────────
  const gameStateRef  = useRef<GameState>("START");
  const scoreRef      = useRef(0);
  const highScoreRef  = useRef(parseInt(localStorage.getItem("duckHuntHighScore") || "0"));
  const roundRef      = useRef(1);
  const hitCountRef   = useRef(0);
  const missCountRef  = useRef(0);

  const slotRef       = useRef(10); // ducks per round, picked on the start screen
  const bulletsRef    = useRef(bulletsFor(10));

  const ducksRef      = useRef<Duck[]>([]);
  const particlesRef  = useRef<Particle[]>([]);
  const floatTextsRef = useRef<{ x: number; y: number; text: string; life: number }[]>([]);

  const spawnedRef        = useRef(0);
  const lastSpawnRef      = useRef(0);
  const dogTimerRef       = useRef(0);
  const roundStartTimeRef = useRef(0);

  const trackedPosRef  = useRef<Pt>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const prevPosRef     = useRef<Pt>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const velRef         = useRef<Pt>({ x: 0, y: 0 });
  const isAimingRef    = useRef(false);
  const isShootingRef  = useRef(false);
  const confidenceRef  = useRef(0);
  const landmarksRef   = useRef<Pt[]>([]);
  const lastShootRef   = useRef(0);
  const shootFlashRef  = useRef(0);
  const speedMultRef   = useRef(1.0); // controlled by speed selector

  // ── Pause-on-no-hand ─────────────────────────────────────────────────────
  const pausedRef      = useRef(false);
  const noHandSinceRef = useRef(0);   // performance.now() when hand was lost
  const pauseStartRef  = useRef(0);   // performance.now() when pause began

  // ── Start new round ──────────────────────────────────────────────────────
  function startRound(round: number, keepScore: boolean) {
    roundRef.current      = round;
    hitCountRef.current   = 0;
    missCountRef.current  = 0;
    bulletsRef.current    = bulletsFor(slotRef.current);
    spawnedRef.current    = 0;
    lastSpawnRef.current  = 0;
    ducksRef.current      = [];
    if (!keepScore) scoreRef.current = 0;
    roundStartTimeRef.current = performance.now();
    gameStateRef.current  = "PLAYING";
    setUiState("PLAYING");
  }

  function startGame() {
    audio.init();
    scoreRef.current = 0;
    highScoreRef.current = parseInt(localStorage.getItem("duckHuntHighScore") || "0");
    startRound(1, true);
  }

  function nextRound() {
    audio.init();
    if (roundRef.current >= TOTAL_ROUNDS) {
      gameStateRef.current = "GAME_OVER";
      setUiState("GAME_OVER");
    } else {
      startRound(roundRef.current + 1, true);
    }
  }

  // ── Collision check ──────────────────────────────────────────────────────
  function checkHit(px: number, py: number) {
    // Pick the closest shootable duck within the hitbox, so overlapping ducks
    // resolve to the one actually under the crosshair.
    let target: Duck | null = null;
    let bestDist = Infinity;
    for (const duck of ducksRef.current) {
      // Only already-dead/dying ducks are unshootable.
      if (duck.state === "HIT" || duck.state === "FALLING") continue;
      if (Math.abs(px - duck.x) < duck.w * 0.7 && Math.abs(py - duck.y) < duck.h * 0.7) {
        const dist = Math.hypot(px - duck.x, py - duck.y);
        if (dist < bestDist) { bestDist = dist; target = duck; }
      }
    }

    if (target) {
      target.state = "HIT";
      target.vx = 0;
      target.vy = 0;
      hitCountRef.current++;
      scoreRef.current += 100 * roundRef.current;
      if (scoreRef.current > highScoreRef.current) {
        highScoreRef.current = scoreRef.current;
        localStorage.setItem("duckHuntHighScore", String(scoreRef.current));
      }
      for (let i = 0; i < 18; i++) {
        particlesRef.current.push({
          x: target.x, y: target.y,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 12 - 3,
          life: 1, color: i % 3 === 0 ? "#FFD700" : "#FFF",
          size: 4 + Math.random() * 6,
        });
      }
      floatTextsRef.current.push({ x: target.x, y: target.y - 20, text: `+${100 * roundRef.current}`, life: 1.2 });
      audio.hit();
      setTimeout(() => { target.state = "FALLING"; }, 400);
    } else {
      audio.miss();
    }
  }

  // ── MediaPipe loop ───────────────────────────────────────────────────────
  useEffect(() => {
    let running = true;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setHasWebcam(true);
        }
      } catch {
        // No webcam — preview environment
      }

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
      } catch {
        // MediaPipe failed — graceful degradation
      }

      track();
    }

    function track() {
      if (!running) return;
      const video = videoRef.current;
      const lm = landmarkerRef.current;

      if (lm && video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const results = lm.detectForVideo(video, Date.now());

        if (results.landmarks && results.landmarks.length > 0) {
          const hand = results.landmarks[0];
          landmarksRef.current = hand;

          // ── Unpause when hand reappears ────────────────────────────────
          if (pausedRef.current) {
            const pausedDuration = performance.now() - pauseStartRef.current;
            roundStartTimeRef.current += pausedDuration; // keep timer honest
            pausedRef.current = false;
          }
          noHandSinceRef.current = 0;

          const tip   = hand[8];  // index fingertip
          const thumb = hand[4];  // thumb tip
          const mcp   = hand[5];  // index MCP (knuckle)
          const wrist = hand[0];  // wrist
          const mid   = hand[12]; // middle fingertip

          // ── Pointing-direction aim ─────────────────────────────────────
          // Project along the wrist→tip vector to get the "barrel" endpoint.
          // This feels more natural than raw tip position.
          const dirX = tip.x - wrist.x;
          const dirY = tip.y - wrist.y;
          const EXTEND = 0.18; // how far past the tip to project
          const aimX = tip.x + dirX * EXTEND;
          const aimY = tip.y + dirY * EXTEND;

          // Mirror horizontally (selfie cam)
          const tx = (1 - aimX) * window.innerWidth;
          const ty = aimY * window.innerHeight;

          // ── Velocity-based prediction ──────────────────────────────────
          const prev = trackedPosRef.current;
          // Adaptive smoothing: more responsive when hand moves fast
          const dist2prev = Math.hypot(tx - prev.x, ty - prev.y);
          const alpha = Math.min(0.72, 0.45 + dist2prev * 0.003);
          const smoothX = prev.x + (tx - prev.x) * alpha;
          const smoothY = prev.y + (ty - prev.y) * alpha;

          // Track velocity for look-ahead
          velRef.current = {
            x: (smoothX - prevPosRef.current.x) * 0.6 + velRef.current.x * 0.4,
            y: (smoothY - prevPosRef.current.y) * 0.6 + velRef.current.y * 0.4,
          };
          prevPosRef.current = { x: smoothX, y: smoothY };

          // Apply a small velocity look-ahead (feels snappier)
          trackedPosRef.current = {
            x: smoothX + velRef.current.x * 0.35,
            y: smoothY + velRef.current.y * 0.35,
          };

          const aiming = tip.y < mcp.y && mid.y > mcp.y;
          isAimingRef.current = aiming;
          confidenceRef.current = tip.visibility ?? 0.9;

          // Normalize pinch threshold by hand size (wrist→mcp distance)
          const handSize = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
          const pinchDist = Math.hypot(tip.x - thumb.x, tip.y - thumb.y);
          const pinching = pinchDist < Math.max(0.04, handSize * 0.35);
          const now = Date.now();

          const canShoot = gameStateRef.current !== "PLAYING" || bulletsRef.current > 0;
          if (pinching && canShoot && now - lastShootRef.current > 500) {
            lastShootRef.current = now;
            isShootingRef.current = true;
            shootFlashRef.current = performance.now();
            setTimeout(() => { isShootingRef.current = false; }, 160);
            audio.init();
            audio.shoot();

            const gs = gameStateRef.current;
            if (gs === "PLAYING") {
              bulletsRef.current = Math.max(0, bulletsRef.current - 1);
              checkHit(trackedPosRef.current.x, trackedPosRef.current.y);
            } else if (gs === "START" || gs === "GAME_OVER") {
              startGame();
            } else if (gs === "ROUND_END") {
              nextRound();
            }
          }

          // Update UI sparingly (every ~6 frames worth)
          if (now % 6 === 0) {
            setUiConfidence(confidenceRef.current);
            setUiAiming(aiming);
            setUiShooting(isShootingRef.current);
          }
        } else {
          landmarksRef.current = [];
          isAimingRef.current = false;
          confidenceRef.current = 0;
          if (Date.now() % 6 === 0) {
            setUiConfidence(0);
            setUiAiming(false);
            setUiShooting(false);
          }

          // ── Pause after 800 ms with no hand ───────────────────────────
          if (gameStateRef.current === "PLAYING") {
            if (noHandSinceRef.current === 0) {
              noHandSinceRef.current = performance.now();
            } else if (!pausedRef.current && performance.now() - noHandSinceRef.current > 800) {
              pausedRef.current = true;
              pauseStartRef.current = performance.now();
            }
          }
        }

        // Draw skeleton on overlay canvas
        drawOverlaySkeleton();
      }

      requestAnimationFrame(track);
    }

    init();
    return () => { running = false; };
  }, []); // ← runs ONCE — never restarts

  // ── Overlay skeleton (webcam panel) ─────────────────────────────────────
  function drawOverlaySkeleton() {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pts = landmarksRef.current;
    if (pts.length === 0) return;

    const mx = (p: Pt) => (1 - p.x) * canvas.width;
    const my = (p: Pt) => p.y * canvas.height;

    const connections: [number, number][] = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12],
      [9,13],[13,14],[14,15],[15,16],
      [13,17],[17,18],[18,19],[19,20],
      [0,17],
    ];

    ctx.strokeStyle = "rgba(0,255,255,0.7)";
    ctx.lineWidth = 1.5;
    connections.forEach(([a, b]) => {
      if (!pts[a] || !pts[b]) return;
      ctx.beginPath();
      ctx.moveTo(mx(pts[a]), my(pts[a]));
      ctx.lineTo(mx(pts[b]), my(pts[b]));
      ctx.stroke();
    });

    ctx.fillStyle = "#0FF";
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(mx(p), my(p), 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Index tip glow
    const tip = pts[8];
    ctx.fillStyle = "#FFF";
    ctx.shadowColor = "#0FF";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(mx(tip), my(tip), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Main game render loop — runs ONCE ────────────────────────────────────
  useEffect(() => {
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    function px(text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left") {
      ctx.font = `${size}px "Press Start 2P", monospace`;
      ctx.textAlign = align;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillText(text, x, y);
      ctx.shadowBlur = 0;
    }

    function render(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Resize canvas to window
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W;
        canvas.height = H;
      }

      // ── Sky ──
      ctx.fillStyle = "#5C94FC";
      ctx.fillRect(0, 0, W, H);

      // Clouds (static decorative)
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      [[120, 80, 70, 30], [350, 60, 90, 35], [600, 90, 60, 25], [900, 70, 80, 32]].forEach(([cx, cy, cw, ch]) => {
        ctx.fillRect(cx, cy, cw, ch);
        ctx.fillRect(cx + 10, cy - 12, cw - 20, ch);
      });

      const gs = gameStateRef.current;
      const paused = pausedRef.current;

      // ── Pause overlay (no hand detected during PLAYING) ──
      if (gs === "PLAYING" && paused) {
        // Dim the scene
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, W, H);

        // Pulsing border
        const pulse = 0.5 + 0.5 * Math.sin(now / 300);
        ctx.strokeStyle = `rgba(255,${Math.floor(100 + 155 * pulse)},0,0.9)`;
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, W - 16, H - 16);

        // Icon — hand outline
        const cx = W / 2, cy = H / 2 - 60;
        ctx.strokeStyle = "#FF8800";
        ctx.lineWidth = 3;
        ctx.strokeRect(cx - 30, cy - 40, 60, 80);
        // Finger stubs
        for (let f = 0; f < 4; f++) {
          ctx.strokeRect(cx - 22 + f * 14, cy - 60, 10, 24);
        }

        px("GAME PAUSED", W / 2, H / 2 + 10, 20, "#FF8800", "center");
        px("SHOW YOUR HAND", W / 2, H / 2 + 46, 13, "#FFD700", "center");
        px("TO RESUME", W / 2, H / 2 + 72, 13, "#FFD700", "center");

        animId = requestAnimationFrame(render);
        return;
      }

      // ── Game logic ──
      if (gs === "PLAYING") {
        const elapsed = (now - roundStartTimeRef.current) / 1000;
        const timeLeft = Math.max(0, roundSecondsFor(slotRef.current, roundRef.current) - elapsed);

        // Spawn ducks
        const spawnInterval = spawnIntervalFor(roundRef.current);
        if (
          spawnedRef.current < slotRef.current &&
          now - lastSpawnRef.current > spawnInterval
        ) {
          const active = ducksRef.current.filter(d => d.state === "FLYING" || d.state === "HIT").length;
          if (active < 2) {
            ducksRef.current.push(spawnDuck(canvas, roundRef.current, speedMultRef.current));
            spawnedRef.current++;
            lastSpawnRef.current = now;
            if (Math.random() > 0.4) audio.flap();
          }
        }

        // Slot over: every duck spawned and gone, OR timer ran out.
        // The dog comes up first; the round summary follows once it's done.
        const allGone = spawnedRef.current >= slotRef.current && ducksRef.current.length === 0;
        if (allGone || timeLeft <= 0) {
          ducksRef.current = [];
          gameStateRef.current = "DOG";
          dogTimerRef.current = now;
          setUiRoundSummary({ round: roundRef.current, hits: hitCountRef.current, score: scoreRef.current });
          if (hitCountRef.current === 0) audio.dogLaugh(); else audio.hit();
        }

        // Timer display
        const timerColor = timeLeft < 10 ? "#FF4444" : "#FFF";
        px(
          `TIME  ${String(Math.ceil(timeLeft)).padStart(2, "0")}`,
          W / 2, 42, 16, timerColor, "center"
        );
      }

      // ── Update & draw ducks ──
      for (let i = ducksRef.current.length - 1; i >= 0; i--) {
        const d = ducksRef.current[i];
        d.frame++;

        if (d.state === "FLYING") {
          d.x += d.vx;
          d.y += d.vy;
          d.vy = d.vy * 0.98 + Math.sin(now / 300 + d.id * 10) * 0.3;
          if (d.x < -120 || d.x > W + 120 || d.y < -120) {
            d.state = "ESCAPING";
          }
        } else if (d.state === "ESCAPING") {
          d.y -= 8;
          if (d.y < -120) {
            missCountRef.current++;
            ducksRef.current.splice(i, 1);
            continue;
          }
        } else if (d.state === "FALLING") {
          d.y += 7;
          d.x += d.vx * 0.3;
          if (d.y > H * 0.82) {
            ducksRef.current.splice(i, 1);
            continue;
          }
        }

        drawDuck(ctx, d);
      }

      // ── Dog: rises out of the grass, holds, sinks back, then the summary shows ──
      if (gs === "DOG") {
        const age = now - dogTimerRef.current;
        const riseMs = 500;
        const up = age < riseMs ? age / riseMs
          : age < DOG_SHOW_MS - riseMs ? 1
          : Math.max(0, (DOG_SHOW_MS - age) / riseMs);
        const top = H * 0.82 - 17 * DOG_PX * up;
        drawDog(ctx, W / 2, top, hitCountRef.current, now);
        if (up === 1 && hitCountRef.current > 0) {
          px(`x${hitCountRef.current}`, W / 2, top - 22 * DOG_PX, 22, "#FFF", "center");
        }
        if (age >= DOG_SHOW_MS) {
          gameStateRef.current = "ROUND_END";
          setUiState("ROUND_END");
        }
      }

      // ── Grass ──
      ctx.fillStyle = "#00A800";
      ctx.fillRect(0, H * 0.82, W, H * 0.18);
      ctx.fillStyle = "#007700";
      for (let x = 0; x < W; x += 36) {
        ctx.fillRect(x, H * 0.82, 18, 16);
      }

      // ── Particles ──
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.4;
        p.life -= dt * 2;
        if (p.life <= 0) { particlesRef.current.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
      }

      // ── Floating score texts ──
      for (let i = floatTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatTextsRef.current[i];
        ft.y -= 1.5;
        ft.life -= dt;
        if (ft.life <= 0) { floatTextsRef.current.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, ft.life);
        px(ft.text, ft.x, ft.y, 14, "#FFD700", "center");
        ctx.globalAlpha = 1;
      }

      // ── Score bar (top) ──
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, 58);
      px(`SCORE  ${String(scoreRef.current).padStart(6, "0")}`, 24, 38, 16, "#FFF");
      px(`BEST  ${String(highScoreRef.current).padStart(6, "0")}`, W / 2, 38, 16, "#FFD700", "center");
      px(`RND ${roundRef.current}/${TOTAL_ROUNDS}`, W - 24, 38, 16, "#5C94FC", "right");

      // ── Duck progress bar (bottom left) ──
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(16, H - 54, 240, 38);
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(16, H - 54, 240, 38);
      const slot = slotRef.current;
      const step = Math.min(22, 222 / slot);
      for (let i = 0; i < slot; i++) {
        const bx = 24 + i * step;
        const by = H - 44;
        const hit = i < hitCountRef.current;
        const miss = !hit && i < hitCountRef.current + missCountRef.current;
        const box = Math.max(8, step - 6);
        ctx.fillStyle = hit ? "#FF4444" : miss ? "#888" : "#333";
        ctx.fillRect(bx, by, box, 16);
        if (hit && box >= 12) {
          ctx.fillStyle = "#FFF";
          ctx.fillRect(bx + box / 2 - 5, by + 6, 10, 3);
          ctx.fillRect(bx + box / 2 - 1.5, by + 3, 3, 10);
        }
      }

      // ── Ammo counter (bottom right) ──
      const bullets = bulletsRef.current;
      const ammoW = 280;
      const ammoX = W - ammoW - 16;
      const ammoY = H - 54;
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(ammoX, ammoY, ammoW, 38);
      ctx.strokeStyle = bullets <= 5 ? "#FF4444" : "#FFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(ammoX, ammoY, ammoW, 38);

      // Label
      px("AMMO", ammoX + 8, ammoY + 26, 10, bullets <= 5 ? "#FF4444" : "#AAA");

      // Bullet pips in two rows (10 for a slot of 5, up to 30 for a slot of 15)
      const maxBullets = bulletsFor(slotRef.current);
      const perRow = Math.ceil(maxBullets / 2);
      const pipStep = Math.min(20, 204 / perRow);
      for (let i = 0; i < maxBullets; i++) {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const bx = ammoX + 64 + col * pipStep;
        const by = ammoY + 8 + row * 14;
        const spent = i >= bullets;
        ctx.fillStyle = spent ? "#333" : (bullets <= 5 ? "#FF4444" : "#FFD700");
        ctx.fillRect(bx, by, Math.min(10, pipStep - 3), 9);
        if (!spent) {
          // Highlight top edge for "live" bullets
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.fillRect(bx, by, Math.min(10, pipStep - 3), 2);
        }
      }

      // ── AR tracking overlay on game canvas ──
      const pts = landmarksRef.current;
      const conf = confidenceRef.current;
      if (conf > 0.4 && pts.length > 0) {
        const mpx = (p: Pt) => (1 - p.x) * W;
        const mpy = (p: Pt) => p.y * H;

        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = "#00FFFF";
        ctx.lineWidth = 1;
        const skelConns: [number, number][] = [[0,5],[5,9],[9,13],[13,17],[0,17],[5,6],[6,7],[7,8]];
        skelConns.forEach(([a, b]) => {
          if (!pts[a] || !pts[b]) return;
          ctx.beginPath();
          ctx.moveTo(mpx(pts[a]), mpy(pts[a]));
          ctx.lineTo(mpx(pts[b]), mpy(pts[b]));
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      // Crosshair
      const tp = trackedPosRef.current;
      const aiming   = isAimingRef.current;
      const shooting = isShootingRef.current;

      const ch_color = aiming ? "#00FFFF" : "rgba(255,80,80,0.85)";
      ctx.strokeStyle = ch_color;
      ctx.lineWidth = aiming ? 2.5 : 1.5;

      // Outer ring
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 22, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(tp.x - 34, tp.y); ctx.lineTo(tp.x - 26, tp.y);
      ctx.moveTo(tp.x + 26, tp.y); ctx.lineTo(tp.x + 34, tp.y);
      ctx.moveTo(tp.x, tp.y - 34); ctx.lineTo(tp.x, tp.y - 26);
      ctx.moveTo(tp.x, tp.y + 26); ctx.lineTo(tp.x, tp.y + 34);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = shooting ? "#FFF" : ch_color;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Shoot flash
      const flashAge = now - shootFlashRef.current;
      if (flashAge < 120) {
        const alpha = 0.45 * (1 - flashAge / 120);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(0, 0, W, H);

        // Ripple
        const rr = Math.max(1, 30 + flashAge * 0.8);
        ctx.strokeStyle = `rgba(0,255,255,${0.7 * (1 - flashAge / 120)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, rr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Scan pulse
      const pulse = (now % 2200) / 2200;
      ctx.strokeStyle = `rgba(0,255,255,${(1 - pulse) * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 22 + pulse * 90, 0, Math.PI * 2);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []); // ← runs ONCE — no deps, never restarts

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none" style={{ cursor: "none" }}>
      {/* Hidden video — source for MediaPipe */}
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />

      {/* Game canvas */}
      <canvas ref={gameCanvasRef} className="absolute inset-0 z-0" />

      {/* UI overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <AnimatePresence>
          {uiState === "START" && (
            <motion.div
              key="start"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm text-center"
            >
              <div style={{ fontFamily: '"Press Start 2P", monospace' }}>
                <h1 className="text-5xl text-[#5C94FC] mb-4 drop-shadow-[0_0_20px_rgba(92,148,252,0.9)]">
                  DUCK HUNT
                </h1>
                <p className="text-[#00FFFF] text-lg tracking-[0.3em] mb-12">WEBCAM EDITION</p>
              </div>

              {!hasWebcam ? (
                <p className="text-yellow-400 animate-pulse" style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 12 }}>
                  INITIALIZING CAMERA SYSTEM...
                </p>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 max-w-sm"
                  style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11 }}>
                  <p className="text-white mb-4 leading-7">1. POINT INDEX FINGER TO AIM</p>
                  <p className="text-white mb-8 leading-7">2. PINCH THUMB TO SHOOT</p>
                  <p className="text-[#5C94FC] mb-6">{TOTAL_ROUNDS} ROUNDS  •  {slotLabel} DUCKS EACH</p>

                  {/* Slot selector: how many ducks fly per round */}
                  <div className="pointer-events-auto mb-6">
                    <p className="text-white/60 mb-3 text-[10px]">DUCKS PER ROUND</p>
                    <div className="flex gap-3 justify-center">
                      {SLOT_OPTIONS.map((n) => {
                        const active = slotLabel === n;
                        return (
                          <button
                            key={n}
                            onClick={() => {
                              setSlotLabel(n);
                              slotRef.current = n;
                              bulletsRef.current = bulletsFor(n);
                            }}
                            className={`px-3 py-2 rounded border text-[10px] transition-all ${
                              active
                                ? "bg-[#00FFFF] text-black border-[#00FFFF]"
                                : "bg-transparent text-white/60 border-white/20 hover:border-white/50"
                            }`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Speed selector — needs pointer-events-auto to be clickable */}
                  <div className="pointer-events-auto mb-8">
                    <p className="text-white/60 mb-3 text-[10px]">DUCK SPEED</p>
                    <div className="flex gap-3 justify-center">
                      {(["SLOW", "NORMAL", "FAST"] as const).map((s) => {
                        const mult = s === "SLOW" ? 0.55 : s === "FAST" ? 1.7 : 1.0;
                        const active = speedLabel === s;
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              setSpeedLabel(s);
                              speedMultRef.current = mult;
                            }}
                            className={`px-3 py-2 rounded border text-[10px] transition-all ${
                              active
                                ? "bg-[#00FFFF] text-black border-[#00FFFF]"
                                : "bg-transparent text-white/60 border-white/20 hover:border-white/50"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[#00FFFF] animate-pulse mt-2">PINCH TO START</p>
                </div>
              )}
            </motion.div>
          )}

          {uiState === "ROUND_END" && (
            <motion.div
              key="roundend"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-center"
            >
              <div style={{ fontFamily: '"Press Start 2P", monospace' }}>
                <h2 className="text-3xl text-white mb-6">ROUND {uiRoundSummary.round} CLEAR</h2>
                <p className="text-[#FFD700] text-xl mb-2">
                  HITS: {uiRoundSummary.hits} / {slotLabel}
                </p>
                <p className="text-[#00FFFF] text-lg mb-10">
                  SCORE: {uiRoundSummary.score}
                </p>
                {uiRoundSummary.round < TOTAL_ROUNDS ? (
                  <>
                    <p className="text-white text-sm mb-4">
                      ROUND {uiRoundSummary.round + 1} OF {TOTAL_ROUNDS} NEXT
                    </p>
                    <p className="text-[#00FFFF] animate-pulse text-base mt-4">PINCH TO CONTINUE</p>
                  </>
                ) : (
                  <p className="text-[#00FFFF] animate-pulse text-base mt-4">PINCH FOR FINAL SCORE</p>
                )}
              </div>
            </motion.div>
          )}

          {uiState === "GAME_OVER" && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center"
            >
              <div style={{ fontFamily: '"Press Start 2P", monospace' }}>
                <h2 className="text-5xl text-[#FF4444] mb-8 drop-shadow-[0_0_20px_rgba(255,68,68,0.9)]">
                  GAME OVER
                </h2>
                <p className="text-white text-xl mb-3">
                  FINAL SCORE: {uiRoundSummary.score}
                </p>
                <p className="text-[#FFD700] text-base mb-12">
                  BEST: {highScoreRef.current}
                </p>
                <p className="text-[#00FFFF] animate-pulse text-base">PINCH TO PLAY AGAIN</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Webcam panel — top right */}
      <div className="absolute top-4 right-4 z-50 w-[220px] rounded-2xl overflow-hidden
        border border-[#00FFFF]/25 shadow-[0_0_24px_rgba(0,255,255,0.12)]
        bg-black/50 backdrop-blur-md">
        <div className="relative w-[220px] h-[165px] bg-black overflow-hidden">
          {/* Clean live webcam — no filters */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            autoPlay playsInline muted
          />
          {/* Skeleton overlay */}
          <canvas ref={overlayRef} width={220} height={165}
            className="absolute inset-0 w-full h-full pointer-events-none" />
          {/* Scanline texture */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "repeating-linear-gradient(transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)" }} />
        </div>

        <div className="px-3 py-2 border-t border-[#00FFFF]/15 text-[11px]"
          style={{ fontFamily: '"Press Start 2P", monospace' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`flex items-center gap-1.5 ${uiConfidence > 0.4 ? "text-[#00FFFF]" : "text-[#FF4444]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-current ${uiConfidence > 0.4 ? "animate-pulse" : ""}`} />
              {uiConfidence > 0.4 ? "LOCKED" : "SCAN..."}
            </span>
            <span className="text-white/40">{Math.round(uiConfidence * 100)}%</span>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#00FFFF] rounded-full transition-all duration-75"
              style={{ width: `${uiConfidence * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 h-3 text-[9px]">
            {uiAiming    && <span className="text-[#00FFFF]">AIM LOCK</span>}
            {uiShooting  && <span className="text-white">FIRE</span>}
          </div>
        </div>
      </div>

      {/* Copyright credit */}
      <div
        className="absolute bottom-3 left-1/2 z-50 -translate-x-1/2 text-[9px] tracking-[0.18em] text-white/45"
        style={{ fontFamily: '"Press Start 2P", monospace' }}
      >
        Created by Yog
      </div>
    </div>
  );
}
