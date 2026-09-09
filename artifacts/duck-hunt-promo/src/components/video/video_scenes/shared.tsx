import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export const ease = [0.16, 1, 0.3, 1] as const;
export const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;

export function SceneShell({ children, tint = 'transparent' }: { children: ReactNode; tint?: string }) {
  return (
    <motion.section
      className="scene-layer"
      initial={{ opacity: 0, clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
      animate={{ opacity: 1, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
      exit={{ opacity: 0, clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
      transition={{ duration: 0.82, ease }}
      style={{ background: tint }}
    >
      {children}
    </motion.section>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="hud-label"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.18, ease }}
    >
      {children}
    </motion.div>
  );
}

export function CornerMark({ right = false }: { right?: boolean }) {
  return (
    <div style={{ position: 'absolute', top: '5.1vh', [right ? 'right' : 'left']: '5.5vw', zIndex: 4 }}>
      <div className="hud-label" style={{ color: 'var(--color-cyan)', fontSize: 'clamp(8px, .8vw, 13px)', letterSpacing: '.22em' }}>
        {right ? 'YOG // 001' : 'DH // CAM-01'}
      </div>
      <div style={{ height: 2, width: '3.6vw', background: right ? 'var(--color-amber)' : 'var(--color-cyan)', marginTop: 7, marginLeft: right ? 'auto' : 0 }} />
    </div>
  );
}

export function ScanField({ accent = 'var(--color-cyan)' }: { accent?: string }) {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: '10% 5% 8%', opacity: .4, pointerEvents: 'none' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="scanline"
          style={{ top: `${15 + i * 18}%`, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: i === 2 ? .8 : .25 }}
          animate={{ x: ['-8%', '8%', '-8%'] }}
          transition={{ duration: 7 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * .3 }}
        />
      ))}
    </div>
  );
}