import React, { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "START" | "PLAYING" | "ROUND_END" | "GAME_OVER";

interface Point {
  x: number;
  y: number;
  z?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Duck {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: "FLYING" | "HIT" | "FALLING" | "ESCAPING";
  width: number;
  height: number;
  frame: number;
  color: string;
  shotsFired: number;
}

class AudioSynth {
  ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new window.AudioContext();
    }
  }

  playShoot() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "square";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playHit() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "square";
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playMiss() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playDuckFlap() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDogLaugh() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "square";
    
    for (let i=0; i<4; i++) {
        osc.frequency.setValueAtTime(400, this.ctx.currentTime + i*0.15);
        osc.frequency.setValueAtTime(500, this.ctx.currentTime + i*0.15 + 0.05);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i*0.15);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + i*0.15 + 0.1);
    }

    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }
}

const audio = new AudioSynth();

export default function Game() {
  const [gameState, setGameState] = useState<GameState>("START");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("duckHuntHighScore") || "0"));
  const [round, setRound] = useState(1);
  const [hitCount, setHitCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  
  const [trackedPos, setTrackedPos] = useState<Point>({ x: window.innerWidth/2, y: window.innerHeight/2 });
  const [isAiming, setIsAiming] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [hasWebcam, setHasWebcam] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [landmarks, setLandmarks] = useState<Point[]>([]);

  const ducksRef = useRef<Duck[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gameTimeRef = useRef(0);
  const lastShootTime = useRef(0);
  const lastDuckSpawnTime = useRef(0);
  const ducksSpawnedThisRound = useRef(0);
  const dogTimerRef = useRef(0);
  
  const DUCKS_PER_ROUND = 10;
  
  const initWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasWebcam(true);
      }
    } catch (e) {
      console.error("Webcam error", e);
    }
  };

  const initMediaPipe = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });
  };

  useEffect(() => {
    initWebcam();
    initMediaPipe();
  }, []);

  const spawnDuck = () => {
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    
    const isLeft = Math.random() > 0.5;
    const yPos = canvas.height * 0.4 + Math.random() * canvas.height * 0.3;
    const speed = 3 + round * 0.5;
    
    ducksRef.current.push({
      id: Date.now(),
      x: isLeft ? -50 : canvas.width + 50,
      y: yPos,
      vx: (isLeft ? 1 : -1) * speed,
      vy: -2 + Math.random() * 4,
      state: "FLYING",
      width: 60,
      height: 50,
      frame: 0,
      color: "#8B4513",
      shotsFired: 0
    });
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for(let i=0; i<15; i++) {
        particlesRef.current.push({
            x, y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 2,
            life: 1.0,
            color,
            size: 4 + Math.random() * 6
        });
    }
  };

  const processFrame = useCallback(() => {
    if (!videoRef.current || !landmarkerRef.current || !hasWebcam) {
      requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(processFrame);
      return;
    }

    const nowInMs = Date.now();
    const results = landmarkerRef.current.detectForVideo(video, nowInMs);

    if (results.landmarks && results.landmarks.length > 0) {
        const hand = results.landmarks[0];
        setLandmarks(hand);
        
        // Map index finger tip
        const indexTip = hand[8];
        const thumbTip = hand[4];
        
        const mappedX = (1 - indexTip.x) * window.innerWidth;
        const mappedY = indexTip.y * window.innerHeight;
        
        // Smooth follow
        setTrackedPos(prev => ({
            x: prev.x + (mappedX - prev.x) * 0.3,
            y: prev.y + (mappedY - prev.y) * 0.3
        }));
        
        setConfidence(hand[8].visibility || 0.9);

        // Simple pose detect
        const indexMCP = hand[5];
        const middleTip = hand[12];
        const isFingerGun = indexTip.y < indexMCP.y && middleTip.y > indexMCP.y;
        setIsAiming(isFingerGun);

        // Shoot on pinch
        const dist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        const shooting = dist < 0.05;
        
        if (shooting && nowInMs - lastShootTime.current > 500) {
            setIsShooting(true);
            lastShootTime.current = nowInMs;
            setTimeout(() => setIsShooting(false), 150);
            
            audio.init();
            
            if (gameState === "PLAYING") {
                audio.playShoot();
                checkHit(mappedX, mappedY);
            } else if (gameState === "START" || gameState === "GAME_OVER" || gameState === "ROUND_END") {
                audio.playShoot();
                
                if (gameState === "START" || gameState === "GAME_OVER") {
                    setGameState("PLAYING");
                    setScore(0);
                    setRound(1);
                    setHitCount(0);
                    setMissCount(0);
                    ducksRef.current = [];
                    ducksSpawnedThisRound.current = 0;
                } else if (gameState === "ROUND_END") {
                    setGameState("PLAYING");
                    setRound(r => r + 1);
                    setHitCount(0);
                    setMissCount(0);
                    ducksRef.current = [];
                    ducksSpawnedThisRound.current = 0;
                }
            }
        }
    } else {
        setConfidence(0);
        setLandmarks([]);
        setIsAiming(false);
    }

    requestAnimationFrame(processFrame);
  }, [hasWebcam, gameState]);

  useEffect(() => {
    requestAnimationFrame(processFrame);
  }, [processFrame]);


  const checkHit = (x: number, y: number) => {
    let hit = false;
    for (let duck of ducksRef.current) {
        if (duck.state !== "FLYING") continue;
        
        // Box collision
        if (Math.abs(x - duck.x) < duck.width && Math.abs(y - duck.y) < duck.height) {
            duck.state = "HIT";
            duck.vy = 0;
            duck.vx = 0;
            hit = true;
            
            setScore(s => {
                const newScore = s + 100;
                if (newScore > highScore) {
                    setHighScore(newScore);
                    localStorage.setItem("duckHuntHighScore", newScore.toString());
                }
                return newScore;
            });
            setHitCount(h => h + 1);
            
            spawnParticles(duck.x, duck.y, "#FFFFFF");
            audio.playHit();
            
            setTimeout(() => {
                if (duck.state === "HIT") duck.state = "FALLING";
            }, 500);
            
            break;
        } else {
            duck.shotsFired++;
            if (duck.shotsFired >= 3) {
                duck.state = "ESCAPING";
            }
        }
    }
    
    if (!hit) {
        audio.playMiss();
    }
  };

  // Game Logic Loop
  useEffect(() => {
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const drawRetroText = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center") => {
        ctx.fillStyle = color;
        ctx.font = `${size}px "Press Start 2P", monospace`;
        ctx.textAlign = align;
        ctx.fillText(text, x, y);
        
        // CRT glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillText(text, x, y);
        ctx.shadowBlur = 0;
    };

    const drawDuck = (duck: Duck) => {
        ctx.save();
        ctx.translate(duck.x, duck.y);
        
        if (duck.vx < 0) ctx.scale(-1, 1);
        
        const w = duck.width;
        const h = duck.height;
        const p = 4; // pixel size
        
        if (duck.state === "HIT") {
            // Hit sprite
            ctx.fillStyle = duck.color;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.fillStyle = "#FFF"; // Eye
            ctx.fillRect(w/4, -h/4, p*2, p*2);
            ctx.fillStyle = "#FFD700"; // Beak
            ctx.fillRect(w/2, -h/4, p*3, p*2);
        } else if (duck.state === "FALLING") {
            // Falling sprite
            ctx.fillStyle = duck.color;
            ctx.fillRect(-w/4, -h/2, w/2, h);
            ctx.translate(0, performance.now() % 200 > 100 ? 5 : -5); // Flapping falling
        } else {
            // Flying sprite (animated)
            ctx.fillStyle = duck.color;
            ctx.fillRect(-w/2, -h/4, w, h/2);
            
            // Wing up/down
            ctx.fillStyle = "#FFF";
            if (duck.frame % 20 < 10) {
                ctx.fillRect(-w/4, -h/2, w/2, h/4);
            } else {
                ctx.fillRect(-w/4, 0, w/2, h/4);
            }
            
            ctx.fillStyle = "#FFD700"; // Beak
            ctx.fillRect(w/2, -h/4, p*3, p*2);
            
            // Eye
            ctx.fillStyle = "#000";
            ctx.fillRect(w/4, -h/4, p, p);
        }
        
        ctx.restore();
    };

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      gameTimeRef.current = time;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // 1. Clear & Background
      ctx.fillStyle = "#5C94FC";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (gameState === "PLAYING") {
          // Spawn logic
          if (time - lastDuckSpawnTime.current > 2000 && ducksSpawnedThisRound.current < DUCKS_PER_ROUND) {
              const activeDucks = ducksRef.current.filter(d => d.state !== "FALLING").length;
              if (activeDucks < 2) {
                  spawnDuck();
                  ducksSpawnedThisRound.current++;
                  lastDuckSpawnTime.current = time;
                  if (Math.random() > 0.5) audio.playDuckFlap();
              }
          }
          
          // Round end logic
          if (ducksSpawnedThisRound.current >= DUCKS_PER_ROUND && ducksRef.current.length === 0) {
              setGameState("ROUND_END");
              dogTimerRef.current = time;
              if (missCount >= 6) {
                  audio.playDogLaugh();
              }
          }
      }

      // 2. Update & Draw Ducks
      for (let i = ducksRef.current.length - 1; i >= 0; i--) {
          const duck = ducksRef.current[i];
          duck.frame++;
          
          if (duck.state === "FLYING") {
              duck.x += duck.vx;
              duck.y += duck.vy;
              
              // Sine wave movement
              duck.vy += Math.sin(time / 200) * 0.5;
              
              // Escaping condition (off screen)
              if (duck.x < -100 || duck.x > canvas.width + 100 || duck.y < -100) {
                  duck.state = "ESCAPING";
              }
          } else if (duck.state === "ESCAPING") {
              duck.y -= 10;
              if (duck.y < -100) {
                  setMissCount(m => m + 1);
                  ducksRef.current.splice(i, 1);
                  continue;
              }
          } else if (duck.state === "FALLING") {
              duck.y += 8;
              if (duck.y > canvas.height * 0.8) {
                  ducksRef.current.splice(i, 1);
                  continue;
              }
          }
          
          drawDuck(duck);
      }

      // 3. Grass Background
      ctx.fillStyle = "#00A800";
      ctx.fillRect(0, canvas.height * 0.8, canvas.width, canvas.height * 0.2);
      
      // Grass detail pixels
      ctx.fillStyle = "#008000";
      for (let x = 0; x < canvas.width; x += 40) {
          ctx.fillRect(x, canvas.height * 0.8, 20, 20);
      }

      // 4. Update & Draw Particles (Feathers/Hits)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.5; // gravity
          p.life -= dt * 2;
          
          if (p.life <= 0) {
              particlesRef.current.splice(i, 1);
              continue;
          }
          
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fillRect(p.x, p.y, p.size, p.size);
          ctx.globalAlpha = 1.0;
      }

      // 5. Draw Dog (Round End)
      if (gameState === "ROUND_END" || gameState === "GAME_OVER") {
          const dogTime = time - dogTimerRef.current;
          if (dogTime < 3000) {
              const dogY = Math.max(canvas.height * 0.6, canvas.height * 0.8 - (dogTime < 1000 ? (dogTime/1000) * 150 : 150));
              ctx.fillStyle = "#8B4513";
              ctx.fillRect(canvas.width/2 - 40, dogY, 80, 100);
              
              if (missCount >= 6) {
                  // Laughing dog
                  const offset = Math.sin(time / 50) * 10;
                  ctx.fillStyle = "#CD853F";
                  ctx.fillRect(canvas.width/2 - 30, dogY + offset, 60, 40); // Snout
              } else {
                  // Holding ducks
                  ctx.fillStyle = "#000";
                  ctx.fillRect(canvas.width/2 - 10, dogY + 10, 20, 20); // Nose
              }
          }
      }

      // 6. AR Overlay / UI
      
      // Top bar
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, 60);
      
      drawRetroText(`SCORE ${score.toString().padStart(6, '0')}`, 150, 40, 20, "#FFF", "left");
      drawRetroText(`HIGH ${highScore.toString().padStart(6, '0')}`, canvas.width - 250, 40, 20, "#FFF", "left");
      
      // HUD Bottom
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(20, canvas.height - 80, 300, 60);
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2;
      ctx.strokeRect(20, canvas.height - 80, 300, 60);
      
      drawRetroText(`R=${round}`, 40, canvas.height - 40, 20, "#5C94FC", "left");
      
      // Duck hit indicators
      for (let i = 0; i < DUCKS_PER_ROUND; i++) {
          const x = 120 + i * 18;
          const y = canvas.height - 50;
          ctx.fillStyle = i < hitCount ? "#FF0000" : (i < hitCount + missCount ? "#FFF" : "#555");
          ctx.fillRect(x, y, 12, 12);
      }

      // 7. AR Tracking Visuals (Futuristic Layer)
      if (hasWebcam && confidence > 0.5) {
          // Draw Skeletal hand on game canvas
          ctx.globalAlpha = 0.2;
          ctx.strokeStyle = "#00FFFF";
          ctx.lineWidth = 1;
          
          if (landmarks.length > 0) {
              const mapPoint = (p: Point) => ({ x: (1-p.x)*canvas.width, y: p.y*canvas.height });
              
              // Draw some connections
              ctx.beginPath();
              [0,1,2,3,4].forEach((i, idx) => {
                  const p = mapPoint(landmarks[i]);
                  if (idx===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
              });
              ctx.stroke();
              
              ctx.beginPath();
              [0,5,6,7,8].forEach((i, idx) => {
                  const p = mapPoint(landmarks[i]);
                  if (idx===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
              });
              ctx.stroke();
          }
          ctx.globalAlpha = 1.0;

          // Crosshair
          ctx.strokeStyle = isAiming ? "#00FFFF" : "rgba(255, 0, 0, 0.5)";
          ctx.lineWidth = isAiming ? 3 : 2;
          
          // Futuristic ring
          ctx.beginPath();
          ctx.arc(trackedPos.x, trackedPos.y, 25, 0, Math.PI * 2);
          ctx.stroke();
          
          // Center dot
          ctx.fillStyle = isShooting ? "#FFF" : (isAiming ? "#00FFFF" : "#F00");
          ctx.beginPath();
          ctx.arc(trackedPos.x, trackedPos.y, 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Ripple effect when shooting
          if (isShooting && lastShootTime.current > 0) {
              const rippleAge = time - lastShootTime.current;
              const rippleRadius = Math.max(1, 40 + rippleAge / 5);
              if (rippleRadius < 300) {
                ctx.strokeStyle = `rgba(0, 255, 255, ${Math.max(0, 0.8 - rippleAge / 500)})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(trackedPos.x, trackedPos.y, rippleRadius, 0, Math.PI * 2);
                ctx.stroke();
              }
          }

          // Scan pulse every 2s
          const pulsePhase = (time % 2000) / 2000;
          ctx.strokeStyle = `rgba(0, 255, 255, ${1 - pulsePhase})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(trackedPos.x, trackedPos.y, 20 + pulsePhase * 100, 0, Math.PI * 2);
          ctx.stroke();
      }

      if (isShooting) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillRect(0,0,canvas.width, canvas.height);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [trackedPos, isShooting, gameState, score, round, hitCount, missCount, hasWebcam, confidence, isAiming, landmarks]);


  // Overlay Canvas Update (Top Right)
  useEffect(() => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.clearRect(0,0,canvas.width, canvas.height);
      
      if (landmarks.length > 0) {
          // Mirror X to match the -scale-x-100 CSS on the video element
          const mx = (p: Point) => (1 - p.x) * canvas.width;
          const my = (p: Point) => p.y * canvas.height;

          ctx.strokeStyle = "rgba(0, 255, 255, 0.6)";
          ctx.lineWidth = 2;
          
          // Hand skeleton connections (MediaPipe hand topology)
          const connections: [number, number][] = [
            [0,1],[1,2],[2,3],[3,4],   // thumb
            [0,5],[5,6],[6,7],[7,8],   // index
            [5,9],[9,10],[10,11],[11,12], // middle
            [9,13],[13,14],[14,15],[15,16], // ring
            [13,17],[17,18],[18,19],[19,20], // pinky
            [0,17]                          // palm base
          ];
          connections.forEach(([a, b]) => {
            if (landmarks[a] && landmarks[b]) {
              ctx.beginPath();
              ctx.moveTo(mx(landmarks[a]), my(landmarks[a]));
              ctx.lineTo(mx(landmarks[b]), my(landmarks[b]));
              ctx.stroke();
            }
          });
          
          // Joints
          ctx.fillStyle = "#0FF";
          landmarks.forEach(l => {
              ctx.beginPath();
              ctx.arc(mx(l), my(l), 3, 0, Math.PI*2);
              ctx.fill();
          });
          
          // Highlight Index Tip
          const tip = landmarks[8];
          ctx.fillStyle = "#FFF";
          ctx.shadowColor = "#0FF";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(mx(tip), my(tip), 6, 0, Math.PI*2);
          ctx.fill();
          ctx.shadowBlur = 0;
      }
  }, [landmarks]);


  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-pixel selection:bg-transparent">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={gameCanvasRef} className="absolute inset-0 z-0" />

      <div className="absolute inset-0 z-10 pointer-events-none">
        <AnimatePresence>
          {gameState === "START" && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-center"
            >
              <h1 className="text-6xl text-[#5C94FC] mb-8 drop-shadow-[0_0_15px_rgba(92,148,252,0.8)]">DUCK HUNT</h1>
              <p className="text-[#00FFFF] tracking-widest text-xl mb-4 font-mono">WEBCAM EDITION</p>
              
              {!hasWebcam ? (
                <div className="text-yellow-400 animate-pulse mt-8">INITIALIZING CAMERA SYSTEM...</div>
              ) : (
                <div className="mt-12 text-white bg-white/5 p-8 rounded-xl border border-white/10 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
                  <p className="mb-4">1. AIM WITH INDEX FINGER</p>
                  <p className="mb-8">2. PINCH THUMB TO SHOOT</p>
                  <div className="text-[#00FFFF] animate-pulse text-2xl mt-8">PINCH TO START</div>
                </div>
              )}
            </motion.div>
          )}

          {gameState === "ROUND_END" && (
             <motion.div 
               initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
               className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-center"
             >
               <h2 className="text-4xl text-white mb-4">ROUND {round} COMPLETE</h2>
               <p className="text-2xl text-[#00FFFF] mb-8">HITS: {hitCount} / {DUCKS_PER_ROUND}</p>
               <div className="text-[#00FFFF] animate-pulse text-xl">PINCH FOR NEXT ROUND</div>
             </motion.div>
          )}

          {gameState === "GAME_OVER" && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
               className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center"
             >
               <h2 className="text-6xl text-red-500 mb-8 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">GAME OVER</h2>
               <p className="text-2xl text-white mb-4">FINAL SCORE: {score}</p>
               <p className="text-xl text-[#00FFFF] mb-12">HIGH SCORE: {highScore}</p>
               <div className="text-[#00FFFF] animate-pulse text-2xl">PINCH TO RESTART</div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AR Overlay Window */}
      <div className="absolute top-4 right-4 z-50 w-[240px] rounded-xl overflow-hidden border border-[#00FFFF]/30 shadow-[0_0_20px_rgba(0,255,255,0.15)] bg-black/60 backdrop-blur-md font-mono">
        <div className="relative w-[240px] h-[180px] bg-black">
          <video 
            ref={videoRef} 
            className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-40 grayscale sepia contrast-150 mix-blend-screen" 
            autoPlay playsInline muted 
          />
          <canvas ref={overlayCanvasRef} width={240} height={180} className="absolute inset-0 w-full h-full" />
          
          {/* Scan lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none opacity-30" />
        </div>
        
        <div className="p-3 text-xs flex flex-col gap-2 border-t border-[#00FFFF]/20">
            <div className="flex items-center justify-between">
                <span className={`flex items-center gap-2 ${confidence > 0.5 ? 'text-[#00FFFF]' : 'text-red-500'}`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse"/>
                    {confidence > 0.5 ? 'TRACKING ACTIVE' : 'SCANNING...'}
                </span>
                <span className="text-white/50">{(confidence * 100).toFixed(0)}%</span>
            </div>
            
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-[#00FFFF] transition-all duration-100" 
                    style={{ width: `${confidence * 100}%` }}
                />
            </div>

            <div className="flex justify-between text-[#00FFFF] font-bold mt-1 h-4">
                {isAiming && <span>👆 AIM LOCK</span>}
                {isShooting && <span className="text-white">⚡ FIRE</span>}
            </div>
        </div>
      </div>
    </div>
  );
}
