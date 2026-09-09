import { motion } from 'framer-motion';
import { CornerMark, Kicker, SceneShell, ScanField, asset, ease } from './shared';

const handLines = [[34, 65, 47, 39], [47, 39, 58, 23], [58, 23, 68, 16], [47, 39, 56, 54], [56, 54, 67, 48], [56, 54, 64, 66], [64, 66, 73, 65], [47, 39, 39, 60], [39, 60, 44, 74]];

export function Scene2() {
  return (
    <SceneShell tint="linear-gradient(100deg, rgba(7,16,23,.3), rgba(19,61,66,.34))">
      <CornerMark />
      <ScanField accent="var(--color-amber)" />
      <div style={{ position: 'absolute', left: '8.5vw', top: '24vh', width: '36vw', zIndex: 2 }}>
        <Kicker>INPUT SOURCE / MEDIAPIPE</Kicker>
        <motion.h2 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .24, duration: .7, ease }} className="display" style={{ fontSize: 'clamp(4.5rem, 10vw, 11rem)', lineHeight: .84, margin: '1vw 0', color: 'var(--color-paper)' }}>
          YOUR
          <br />
          <span style={{ color: 'var(--color-cyan)' }}>INDEX</span>
          <br />
          IS THE
          <br />
          GUN.
        </motion.h2>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1, duration: .5, ease }} style={{ display: 'flex', gap: '1vw', alignItems: 'center', marginTop: '1.6vw' }}>
          <div style={{ width: '2.2vw', height: 2, background: 'var(--color-amber)' }} />
          <span className="hud-label" style={{ color: 'var(--color-amber)' }}>NO MOUSE / NO CURSOR</span>
        </motion.div>
      </div>
      <div className="pixel-border" style={{ position: 'absolute', right: '8.5vw', top: '15vh', width: '39vw', height: '70vh', background: 'rgba(4,18,25,.66)', overflow: 'hidden' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .35, duration: .7 }} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${asset('tracking-hand.png')})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .54, mixBlendMode: 'screen' }} />
        <div style={{ position: 'absolute', inset: '8% 7%', border: '1px solid rgba(98,231,214,.35)' }}>
          <span className="hud-label" style={{ position: 'absolute', top: 10, left: 12 }}>LIVE HAND SKELETON</span>
          <span className="hud-value" style={{ position: 'absolute', right: 12, top: 10 }}>01 / 01</span>
          {handLines.map(([x1, y1, x2, y2], i) => (
            <motion.div key={i} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: .55 + i * .08, duration: .28, ease }} style={{ position: 'absolute', left: `${x1}%`, top: `${y1}%`, width: `${Math.hypot(x2 - x1, y2 - y1)}%`, height: 1, background: i === 1 ? 'var(--color-amber)' : 'var(--color-cyan)', transformOrigin: 'left', transform: `rotate(${Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI}deg)` }} />
          ))}
          {[['TIP 08', 68, 16], ['WRIST 00', 34, 65], ['0.94 CONF', 72, 82]].map(([label, left, top], i) => (
            <motion.div key={String(label)} initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .92 + i * .2, duration: .35, ease }} style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)', color: i === 0 ? 'var(--color-amber)' : 'var(--color-cyan)', font: '700 clamp(8px, .9vw, 13px) var(--font-body)', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, background: 'currentColor', marginRight: 7 }} />{label}
            </motion.div>
          ))}
          <motion.div className="animate-scan" style={{ top: 0, left: 0, background: 'linear-gradient(90deg, transparent, var(--color-cyan), transparent)' }} />
        </div>
      </div>
    </SceneShell>
  );
}