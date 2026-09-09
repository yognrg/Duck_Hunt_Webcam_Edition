import { motion } from 'framer-motion';
import { CornerMark, Kicker, SceneShell, ease } from './shared';

export function Scene3() {
  return (
    <SceneShell tint="radial-gradient(circle at 69% 48%, rgba(245,187,100,.17), transparent 23%), linear-gradient(135deg, #08131b, #193844)">
      <CornerMark right />
      <div style={{ position: 'absolute', left: '9vw', top: '22vh', zIndex: 2 }}>
        <Kicker>GESTURE EVENT / THRESHOLD 0.35</Kicker>
        <motion.h2 initial={{ opacity: 0, scale: .9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: .22, duration: .8, ease }} className="display" style={{ fontSize: 'clamp(6rem, 15vw, 17rem)', lineHeight: .75, margin: '1vw 0 1.4vw', color: 'var(--color-paper)' }}>
          PINCH
          <br />
          <span style={{ color: 'var(--color-amber)' }}>TO</span>
          <br />
          <span className="outline-type">SHOOT</span>
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: .5, ease }} style={{ color: 'var(--color-mist)', fontSize: 'clamp(9px, 1vw, 15px)', letterSpacing: '.12em', maxWidth: '28vw', lineHeight: 1.6, margin: 0 }}>
          Thumb meets index. The camera reads the gesture. The shot lands in the same frame.
        </motion.p>
      </div>
      <div style={{ position: 'absolute', right: '10vw', top: '22vh', width: '34vw', height: '56vh' }}>
        <motion.div initial={{ opacity: 0, rotate: -12, scale: .7 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} transition={{ delay: .5, duration: 1, ease }} style={{ position: 'absolute', width: '17vw', height: '17vw', border: '1px solid var(--color-cyan)', borderRadius: '50%', left: '4vw', top: '8vh', boxShadow: '0 0 0 2vw rgba(98,231,214,.05), 0 0 0 5vw rgba(98,231,214,.03)' }} />
        <motion.div initial={{ opacity: 0, scale: .2 }} animate={{ opacity: [0, 1, .7, 1], scale: [0.2, 1.15, .92, 1] }} transition={{ delay: 1.12, duration: .8, ease }} style={{ position: 'absolute', left: '12.2vw', top: '16.3vh', width: 13, height: 13, borderRadius: '50%', background: 'var(--color-amber)', boxShadow: '0 0 24px var(--color-amber)' }} />
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.25, duration: .4, ease }} style={{ position: 'absolute', left: '1vw', top: '18vh', width: '29vw', height: 1, background: 'var(--color-cyan)', transformOrigin: 'left', transform: 'rotate(-14deg)' }} />
        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 1.38, duration: .4, ease }} style={{ position: 'absolute', left: '12.7vw', top: '5vh', width: 1, height: '26vh', background: 'var(--color-amber)', transformOrigin: 'top' }} />
        <div style={{ position: 'absolute', bottom: '3vh', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(98,231,214,.32)', paddingTop: 14 }}>
          <span className="hud-label">PINCH DETECTED</span>
          <span className="hud-value animate-blink">FIRE CONFIRMED</span>
        </div>
      </div>
    </SceneShell>
  );
}