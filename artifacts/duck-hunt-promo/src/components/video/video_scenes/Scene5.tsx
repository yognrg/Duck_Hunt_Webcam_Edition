import { motion } from 'framer-motion';
import { CornerMark, Kicker, SceneShell, ScanField, ease } from './shared';

export function Scene5() {
  return (
    <SceneShell tint="linear-gradient(135deg, rgba(79,26,28,.9), rgba(7,16,23,.96))">
      <CornerMark />
      <ScanField accent="var(--color-coral)" />
      <div style={{ position: 'absolute', left: '8vw', top: '22vh', zIndex: 2 }}>
        <Kicker>SAFETY STATE / HAND LOST</Kicker>
        <motion.h2 initial={{ opacity: 0, x: -36 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .23, duration: .8, ease }} className="display" style={{ fontSize: 'clamp(5rem, 13vw, 14rem)', lineHeight: .78, margin: '1vw 0', color: 'var(--color-paper)' }}>
          NO HAND?
          <br />
          <span style={{ color: 'var(--color-coral)' }}>NO PLAY.</span>
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: .6 }} style={{ margin: 0, color: 'var(--color-amber)', letterSpacing: '.14em', fontSize: 'clamp(9px, 1.05vw, 15px)' }}>
          THE FIELD PAUSES. YOUR ROUND STAYS INTACT.
        </motion.p>
      </div>
      <div style={{ position: 'absolute', right: '12vw', top: '19vh', width: '28vw', height: '53vh', border: '1px solid rgba(239,118,109,.55)', background: 'rgba(7,16,23,.62)', display: 'grid', placeItems: 'center' }}>
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [.4, .8, .4] }} transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', width: '15vw', height: '15vw', border: '1px solid var(--color-coral)', borderRadius: '50%' }} />
        <motion.div animate={{ scale: [1, .85, 1], opacity: [.8, .25, .8] }} transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', width: '8vw', height: '8vw', border: '1px solid var(--color-amber)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', width: '8vw', height: '10vw', border: '2px solid var(--color-amber)', borderRadius: '40% 40% 46% 46%', opacity: .78 }}>
          {[0,1,2,3].map((i) => <span key={i} style={{ position: 'absolute', top: '-2.3vw', left: `${.7 + i * 1.65}vw`, width: '1vw', height: '3.1vw', border: '2px solid var(--color-amber)', borderBottom: 0 }} />)}
        </div>
        <span className="hud-label" style={{ position: 'absolute', bottom: '9%', color: 'var(--color-coral)' }}>SHOW YOUR HAND TO RESUME</span>
        <motion.div className="scanline" animate={{ y: ['-15vh', '48vh'] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }} style={{ top: 0, background: 'linear-gradient(90deg, transparent, var(--color-coral), transparent)' }} />
      </div>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: .8, duration: .5, ease }} style={{ position: 'absolute', left: '8vw', bottom: '13vh', width: '23vw', height: 1, transformOrigin: 'left', background: 'var(--color-coral)' }} />
    </SceneShell>
  );
}