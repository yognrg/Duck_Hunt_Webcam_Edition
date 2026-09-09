import { motion } from 'framer-motion';
import { CornerMark, Kicker, SceneShell, ease } from './shared';

const features = [
  ['01', 'REAL HAND', 'MediaPipe sees the gesture.'],
  ['02', 'FAST AIM', 'Index tip drives the crosshair.'],
  ['03', '20 ROUNDS', 'Ammo makes every pinch count.'],
];

export function Scene6() {
  return (
    <SceneShell tint="radial-gradient(circle at 50% 50%, rgba(98,231,214,.11), transparent 42%), linear-gradient(135deg, #071017, #10313a)">
      <CornerMark />
      <CornerMark right />
      <div style={{ position: 'absolute', left: '8vw', top: '17vh' }}>
        <Kicker>SYSTEM READOUT / FULL LOOP</Kicker>
        <motion.h2 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .75, ease }} className="display" style={{ margin: '.8vw 0 0', color: 'var(--color-paper)', fontSize: 'clamp(4rem, 9vw, 10rem)', lineHeight: .83, maxWidth: '65vw' }}>
          A SHOOTING
          <br />
          <span style={{ color: 'var(--color-cyan)' }}>RANGE</span> IN YOUR
          <br />
          LIVING ROOM.
        </motion.h2>
      </div>
      <div style={{ position: 'absolute', left: '8vw', right: '8vw', bottom: '14vh', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.2vw' }}>
        {features.map(([n, title, desc], i) => (
          <motion.div key={n} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .64 + i * .18, duration: .5, ease }} className="pixel-border" style={{ padding: '1.2vw 1.3vw 1.4vw', background: 'rgba(7,16,23,.47)', minHeight: '13vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.9vw' }}><span className="hud-value" style={{ color: 'var(--color-amber)' }}>{n}</span><span style={{ width: 8, height: 8, background: i === 1 ? 'var(--color-cyan)' : 'var(--color-amber)', borderRadius: '50%', boxShadow: '0 0 12px currentColor' }} /></div>
            <div className="display" style={{ color: 'var(--color-paper)', fontSize: 'clamp(1.7rem, 2.7vw, 3.3rem)', lineHeight: .85 }}>{title}</div>
            <div className="hud-label" style={{ marginTop: '.75vw', letterSpacing: '.08em', color: 'var(--color-mist)' }}>{desc}</div>
          </motion.div>
        ))}
      </div>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', right: '11vw', top: '29vh', width: '19vw', height: '19vw', border: '1px dashed rgba(98,231,214,.34)', borderRadius: '50%' }}>
        <span style={{ position: 'absolute', left: '50%', top: -5, width: 10, height: 10, background: 'var(--color-cyan)', transform: 'translateX(-50%)' }} />
      </motion.div>
    </SceneShell>
  );
}