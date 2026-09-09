import { motion } from 'framer-motion';
import { CornerMark, Kicker, SceneShell, ScanField, asset, ease } from './shared';

export function Scene1() {
  return (
    <SceneShell tint="linear-gradient(120deg, rgba(7,16,23,.1), rgba(9,57,59,.26))">
      <CornerMark />
      <CornerMark right />
      <ScanField />
      <motion.div className="animate-float" style={{ position: 'absolute', right: '10vw', top: '15vh', width: '25vw', height: '25vw', border: '1px solid rgba(98,231,214,.16)', borderRadius: '50%' }} />
      <motion.div className="animate-pulse-ring" style={{ position: 'absolute', right: '20vw', top: '24vh', width: '6vw', height: '6vw', border: '1px solid var(--color-amber)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', left: '10vw', top: '29vh', zIndex: 2 }}>
        <Kicker>DUCK HUNT / WEBCAM EDITION</Kicker>
        <motion.h1
          className="display"
          initial={{ opacity: 0, y: 35, letterSpacing: '.18em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '-.015em' }}
          transition={{ duration: 1, delay: .32, ease }}
          style={{ color: 'var(--color-paper)', fontSize: 'clamp(5rem, 13.5vw, 15rem)', lineHeight: .8, margin: '.7vw 0 1.3vw', maxWidth: '57vw' }}
        >
          POINT.
          <br />
          <span style={{ color: 'var(--color-cyan)' }}>PINCH.</span>
          <br />
          <span className="outline-type">BLAST.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.12, duration: .6, ease }} style={{ color: 'var(--color-amber)', fontSize: 'clamp(10px, 1.2vw, 18px)', letterSpacing: '.15em', margin: 0 }}>
          A REAL-WORLD ARCADE AIM TRAINER
        </motion.p>
      </div>
      <motion.img
        src={asset('pixel-duck.png')}
        alt=""
        initial={{ opacity: 0, x: 110, scale: .55, rotate: -8 }}
        animate={{ opacity: 1, x: 0, scale: 1, rotate: 4 }}
        transition={{ delay: .62, duration: 1.15, ease }}
        style={{ position: 'absolute', right: '12vw', top: '34vh', width: '20vw', imageRendering: 'pixelated', filter: 'drop-shadow(0 0 22px rgba(245,187,100,.18))' }}
      />
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.36, duration: .55, ease }} style={{ position: 'absolute', left: '10vw', bottom: '14vh', width: '33vw', height: 2, transformOrigin: 'left', background: 'var(--color-cyan)' }} />
      <div className="noise animate-grain" />
    </SceneShell>
  );
}