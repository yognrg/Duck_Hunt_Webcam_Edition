import { motion } from 'framer-motion';
import { CornerMark, Kicker, SceneShell, asset, ease } from './shared';

function PipRow({ count = 20 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 5, width: '11vw' }}>
      {Array.from({ length: count }).map((_, i) => <span key={i} style={{ display: 'block', height: 7, background: i < 14 ? 'var(--color-amber)' : 'rgba(227,238,229,.16)' }} />)}
    </div>
  );
}

export function Scene4() {
  return (
    <SceneShell tint="linear-gradient(#315c76 0%, #6ea5a0 65%, #466c45 65%, #1d422d 100%)">
      <CornerMark />
      <div style={{ position: 'absolute', left: '6vw', top: '8vh', color: 'var(--color-paper)', zIndex: 2 }}>
        <Kicker>ROUND 03 / FIELD TEST</Kicker>
      </div>
      <motion.div initial={{ y: 45, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .32, duration: .72, ease }} style={{ position: 'absolute', left: '7vw', right: '7vw', top: '15vh', bottom: '14vh', border: '3px solid #071017', boxShadow: '10px 10px 0 rgba(7,16,23,.58)', overflow: 'hidden', background: '#70b5ce' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #5c94fc 0%, #9bdbec 69%, #00a800 69%, #007700 100%)' }} />
        <div style={{ position: 'absolute', top: '11%', left: '14%', width: '14%', height: 15, background: 'rgba(227,238,229,.7)', boxShadow: '20px -9px 0 rgba(227,238,229,.7), 44px 1px 0 rgba(227,238,229,.7)' }} />
        <div style={{ position: 'absolute', top: '26%', right: '19%', width: '12%', height: 12, background: 'rgba(227,238,229,.68)', boxShadow: '20px 7px 0 rgba(227,238,229,.68)' }} />
        <motion.img src={asset('pixel-duck.png')} alt="" initial={{ x: '-8vw', y: '7vh', rotate: -5 }} animate={{ x: '46vw', y: '-2vh', rotate: 5 }} transition={{ duration: 2.6, delay: .48, ease: [0.36, .1, .22, 1], repeat: Infinity, repeatType: 'reverse', repeatDelay: .3 }} style={{ position: 'absolute', top: '24%', left: '2%', width: '7.5vw', imageRendering: 'pixelated' }} />
        <motion.div animate={{ x: [0, 3, 0], y: [0, -2, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', bottom: '16%', left: '47%', width: '5vw', height: '7vw', background: '#b8733c', border: '3px solid #071017', boxShadow: '0 -2.4vw 0 #75411f, -1.6vw -1.3vw 0 -1vw #75411f, 1.6vw -1.3vw 0 -1vw #75411f' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 47, background: 'rgba(7,16,23,.88)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2vw', color: 'var(--color-paper)', font: '700 clamp(9px, 1vw, 16px) var(--font-body)', letterSpacing: '.05em' }}>
          <span>SCORE&nbsp; 001200</span><span style={{ color: 'var(--color-amber)' }}>BEST&nbsp; 008400</span><span style={{ color: 'var(--color-cyan)' }}>RND&nbsp; 03 / 05</span>
        </div>
        <motion.div animate={{ x: [0, 4, 0], y: [0, -4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', left: '67%', top: '38%', width: '4.3vw', height: '4.3vw', border: '2px solid var(--color-cyan)', borderRadius: '50%', boxShadow: '0 0 0 1vw rgba(98,231,214,.08)' }}>
          <span style={{ position: 'absolute', left: '50%', top: -10, bottom: -10, width: 1, background: 'var(--color-cyan)', transform: 'translateX(-50%)' }} /><span style={{ position: 'absolute', top: '50%', left: -10, right: -10, height: 1, background: 'var(--color-cyan)', transform: 'translateY(-50%)' }} /><i style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-amber)', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }} />
        </motion.div>
        <div style={{ position: 'absolute', left: '2vw', bottom: '2vw', display: 'flex', alignItems: 'center', gap: '1.4vw', background: 'rgba(7,16,23,.88)', padding: '1vw 1.2vw' }}><span className="hud-label" style={{ color: 'var(--color-paper)' }}>DUCKS</span>{[0,1,2,3,4,5,6,7,8,9].map((i) => <i key={i} style={{ width: 9, height: 9, background: i < 4 ? 'var(--color-coral)' : 'rgba(227,238,229,.2)' }} />)}</div>
        <div style={{ position: 'absolute', right: '2vw', bottom: '2vw', display: 'flex', alignItems: 'center', gap: '1.2vw', background: 'rgba(7,16,23,.88)', padding: '1vw 1.2vw' }}><span className="hud-label" style={{ color: 'var(--color-paper)' }}>AMMO</span><PipRow /></div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.25, duration: .4 }} style={{ position: 'absolute', right: '8.2vw', top: '11vh', color: 'var(--color-paper)', zIndex: 3 }}><span className="hud-label" style={{ color: 'var(--color-amber)' }}>RETRO GAMEPLAY // LIVE</span></motion.div>
    </SceneShell>
  );
}