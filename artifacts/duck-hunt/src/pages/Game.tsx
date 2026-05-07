import React, { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ──────────────────────────────────────────────────────────────
const DUCKS_PER_ROUND = 10;
const TOTAL_ROUNDS = 5;
const ROUND_DURATION_SEC = 45;

// ── Types ──────────────────────────────────────────────────────────────────
type GameState = "START" | "PLAYING" | "ROUND_END" | "GAME_OVER";

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

function spawnDuck(canvas: HTMLCanvasElement, round: number): Duck {
  const fromLeft = Math.random() > 0.5;
  const speed = 2.5 + round * 0.4;
  return {
    id: Math.random(),
    x: fromLeft ? -60 : canvas.width + 60,
    y: canvas.height * 0.2 + Math.random() * canvas.height * 0.45,
    vx: (fromLeft ? 1 : -1) * speed,
    vy: (Math.random() - 0.5) * 2,
    state: "FLYING",
    w: 60, h: 48,
    frame: 0,
    shotsFired: 0,
  };
}

function drawDuck(ctx: CanvasRenderingContext2D, duck: Duck) {
  ctx.save();
  ctx.translate(duck.x, duck.y);
  if (duck.vx < 0) ctx.scale(-1, 1);

  const { w, h } = duck;
  const p = 4;

  if (duck.state === "HIT" || duck.state === "FALLING") {
    ctx.rotate(duck.state === "FALLING" ? Math.PI / 6 : 0);
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(w / 2 - p, -h / 4, p * 3, p * 2);
    ctx.fillStyle = "#FFF";
    ctx.fillRect(w / 4, -h / 4, p * 2, p * 2);
  } else {
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-w / 2, -h / 4, w, h / 2);
    ctx.fillStyle = duck.frame % 20 < 10 ? "#A0522D" : "#D2691E";
    ctx.fillRect(-w / 4, duck.frame % 20 < 10 ? -h / 2 : h / 8, w / 2, h / 3);
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(w / 2 - p, -p, p * 3, p * 2);
    ctx.fillStyle = "#000";
    ctx.fillRect(w / 4, -h / 4, p, p);
    ctx.fillStyle = "#FFF";
    ctx.fillRect(w / 4 + 1, -h / 4 + 1, p - 2, p - 2);
  }
  ctx.restore();
}

function drawDog(ctx: CanvasRenderingContext2D, cx: number, cy: number, laugh: boolean, t: number) {
  const bounce = laugh ? Math.sin(t / 80) * 6 : 0;
  const y = cy + bounce;

  ctx.fillStyle = "#CD853F";
  ctx.fillRect(cx - 20, y, 40, 50);
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(cx - 15, y - 30, 30, 35);
  ctx.fillRect(cx - 28, y - 20, 14, 8);
  ctx.fillRect(cx + 14, y - 20, 14, 8);
  ctx.fillStyle = "#000";
  ctx.fillRect(cx - 8, y - 22, 6, 6);
  ctx.fillRect(cx + 2, y - 22, 6, 6);
  ctx.fillStyle = "#FFB6C1";
  if (laugh) {
    ctx.fillRect(cx - 12, y - 8, 24, 10);
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(cx - 6, y - 6, 12, 4);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(cx - 4, y - 6, 8, 4);
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

  const ducksRef      = useRef<Duck[]>([]);
  const particlesRef  = useRef<Particle[]>([]);
  const floatTextsRef = useRef<{ x: number; y: number; text: string; life: number }[]>([]);

  const spawnedRef        = useRef(0);
  const lastSpawnRef      = useRef(0);
  const dogTimerRef       = useRef(0);
  const roundStartTimeRef = useRef(0);

  const trackedPosRef = useRef<Pt>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const isAimingRef   = useRef(false);
  const isShootingRef = useRef(false);
  const confidenceRef = useRef(0);
  const landmarksRef  = useRef<Pt[]>([]);
  const lastShootRef  = useRef(0);
  const shootFlashRef = useRef(0);

  // ── Start new round ──────────────────────────────────────────────────────
  function startRound(round: number, keepScore: boolean) {
    roundRef.current      = round;
    hitCountRef.current   = 0;
    missCountRef.current  = 0;
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
    let hit = false;
    for (const duck of ducksRef.current) {
      if (duck.state !== "FLYING") continue;
      if (Math.abs(px - duck.x) < duck.w * 0.7 && Math.abs(py - duck.y) < duck.h * 0.7) {
        duck.state = "HIT";
        duck.vx = 0;
        duck.vy = 0;
        hit = true;
        hitCountRef.current++;
        scoreRef.current += 100 * roundRef.current;
        if (scoreRef.current > highScoreRef.current) {
          highScoreRef.current = scoreRef.current;
          localStorage.setItem("duckHuntHighScore", String(scoreRef.current));
        }
        for (let i = 0; i < 18; i++) {
          particlesRef.current.push({
            x: duck.x, y: duck.y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12 - 3,
            life: 1, color: i % 3 === 0 ? "#FFD700" : "#FFF",
            size: 4 + Math.random() * 6,
          });
        }
        floatTextsRef.current.push({ x: duck.x, y: duck.y - 20, text: `+${100 * roundRef.current}`, life: 1.2 });
        audio.hit();
        setTimeout(() => { duck.state = "FALLING"; }, 400);
        break;
      } else {
        duck.shotsFired++;
        if (duck.shotsFired >= 3) duck.state = "ESCAPING";
      }
    }
    if (!hit) audio.miss();
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

          const tip   = hand[8];  // index fingertip
          const thumb = hand[4];  // thumb tip
          const mcp   = hand[5];  // index MCP
          const mid   = hand[12]; // middle fingertip

          // Mirrored mapping
          const tx = (1 - tip.x) * window.innerWidth;
          const ty = tip.y * window.innerHeight;

          // Smooth
          trackedPosRef.current = {
            x: trackedPosRef.current.x + (tx - trackedPosRef.current.x) * 0.35,
            y: trackedPosRef.current.y + (ty - trackedPosRef.current.y) * 0.35,
          };

          const aiming = tip.y < mcp.y && mid.y > mcp.y;
          isAimingRef.current = aiming;
          confidenceRef.current = tip.visibility ?? 0.9;

          const dist = Math.hypot(tip.x - thumb.x, tip.y - thumb.y);
          const pinching = dist < 0.06;
          const now = Date.now();

          if (pinching && now - lastShootRef.current > 500) {
            lastShootRef.current = now;
            isShootingRef.current = true;
            shootFlashRef.current = performance.now();
            setTimeout(() => { isShootingRef.current = false; }, 160);
            audio.init();
            audio.shoot();

            const gs = gameStateRef.current;
            if (gs === "PLAYING") {
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

      // ── Game logic ──
      if (gs === "PLAYING") {
        const elapsed = (now - roundStartTimeRef.current) / 1000;
        const timeLeft = Math.max(0, ROUND_DURATION_SEC - elapsed);

        // Spawn ducks
        const spawnInterval = Math.max(1500, 4000 - roundRef.current * 300);
        if (
          spawnedRef.current < DUCKS_PER_ROUND &&
          now - lastSpawnRef.current > spawnInterval
        ) {
          const active = ducksRef.current.filter(d => d.state === "FLYING" || d.state === "HIT").length;
          if (active < 2) {
            ducksRef.current.push(spawnDuck(canvas, roundRef.current));
            spawnedRef.current++;
            lastSpawnRef.current = now;
            if (Math.random() > 0.4) audio.flap();
          }
        }

        // Round over: all ducks spawned and gone, OR timer ran out
        const allGone = spawnedRef.current >= DUCKS_PER_ROUND && ducksRef.current.length === 0;
        if (allGone || timeLeft <= 0) {
          // Force any remaining ducks to escape
          ducksRef.current = [];
          gameStateRef.current = "ROUND_END";
          dogTimerRef.current = now;
          setUiRoundSummary({ round: roundRef.current, hits: hitCountRef.current, score: scoreRef.current });
          setUiState("ROUND_END");
          if (missCountRef.current >= 6) audio.dogLaugh();
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

      // ── Dog (round-end / game-over) ──
      if (gs === "ROUND_END" || gs === "GAME_OVER") {
        const age = now - dogTimerRef.current;
        if (age < 4000) {
          const rise = Math.min(1, age / 800);
          const dogY = H * 0.82 - 70 * rise;
          drawDog(ctx, W / 2, dogY, missCountRef.current >= 6, now);
        }
      }

      // ── Score bar (top) ──
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, 58);
      px(`SCORE  ${String(scoreRef.current).padStart(6, "0")}`, 24, 38, 16, "#FFF");
      px(`BEST  ${String(highScoreRef.current).padStart(6, "0")}`, W / 2, 38, 16, "#FFD700", "center");
      px(`RND ${roundRef.current}/${TOTAL_ROUNDS}`, W - 24, 38, 16, "#5C94FC", "right");

      // ── Duck progress bar (bottom) ──
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(16, H - 54, 240, 38);
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(16, H - 54, 240, 38);
      for (let i = 0; i < DUCKS_PER_ROUND; i++) {
        const bx = 24 + i * 22;
        const by = H - 44;
        const hit = i < hitCountRef.current;
        const miss = !hit && i < hitCountRef.current + missCountRef.current;
        ctx.fillStyle = hit ? "#FF4444" : miss ? "#888" : "#333";
        ctx.fillRect(bx, by, 16, 16);
        if (hit) {
          ctx.fillStyle = "#FFF";
          ctx.fillRect(bx + 3, by + 6, 10, 3);
          ctx.fillRect(bx + 6, by + 3, 3, 10);
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
                  <p className="text-[#5C94FC] mb-3">{TOTAL_ROUNDS} ROUNDS  •  {DUCKS_PER_ROUND} DUCKS EACH</p>
                  <p className="text-[#5C94FC] mb-8">{ROUND_DURATION_SEC}s PER ROUND</p>
                  <p className="text-[#00FFFF] animate-pulse mt-4">PINCH TO START</p>
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
                  HITS: {uiRoundSummary.hits} / {DUCKS_PER_ROUND}
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
    </div>
  );
}
