import { motion } from 'framer-motion';
import { CornerMark, SceneShell, asset, ease } from './shared';

export function Scene7() {
  return (
    <SceneShell tint="radial-gradient(circle at 72% 35%, rgba(245,187,100,.16), transparent 22%), linear-gradient(120deg, #071017, #123842)">
      <CornerMark />
      <motion.div initial={{ scale: .5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .18, duration: 1.1, ease }} style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%,-50%)', width: '23vw', height: '23vw', border: '1px solid rgba(98,231,214,.5)', borderRadius: '50%', boxShadow: '0 0 0 1.8vw rgba(98,231,214,.06), 0 0 0 5vw rgba(98,231,214,.03)' }} />
      <motion.img src={asset('pixel-duck.png')} alt="" initial={{ opacity: 0, scale: .3, rotate: -15 }} animate={{ opacity: 1, scale: 1, rotate: 8 }} transition={{ delay: .52, duration: .9, ease }} style={{ position: 'absolute', width: '13vw', left: '50%', top: '30%', transform: 'translateX(-50%)', imageRendering: 'pixelated', filter: 'drop-shadow(0 0 25px rgba(245,187,100,.22))' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '68vh', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 18, letterSpacing: '.4em' }} animate={{ opacity: 1, y: 0, letterSpacing: '.11em' }} transition={{ delay: .93, duration: .8, ease }} className="display" style={{ color: 'var(--color-paper)', fontSize: 'clamp(4rem, 8.5vw, 9rem)', lineHeight: .78 }}>
          DUCK HUNT
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.38, duration: .6 }} style={{ color: 'var(--color-cyan)', font: '700 clamp(10px, 1.2vw, 18px) var(--font-body)', letterSpacing: '.2em', marginTop: '1.1vw' }}>
          WEBCAM EDITION
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.82, duration: .55, ease }} className="hud-label" style={{ color: 'var(--color-amber)', marginTop: '2.5vw', letterSpacing: '.17em' }}>
          CREATED BY YOG
        </motion.div>
      </div>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.2, duration: .7, ease }} style={{ position: 'absolute', left: '37vw', right: '37vw', top: '64.5vh', height: 1, background: 'var(--color-amber)', transformOrigin: 'center' }} />
    </SceneShell>
  );
}