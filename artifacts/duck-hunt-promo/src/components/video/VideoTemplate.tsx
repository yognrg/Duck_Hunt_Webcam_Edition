import {
  SafeFrame,
  VideoCanvas,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';

const SCENE_DURATIONS = {
  coldOpen: 3800,
  tracking: 3900,
  gesture: 3600,
  fieldTest: 4700,
  safety: 3800,
  system: 4300,
  lockup: 4000,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <VideoCanvas
      aspectRatio={VIDEO_ASPECT_RATIO}
      className="video-root"
    >
      <SafeFrame style={{ position: 'absolute', inset: 0, padding: 0, pointerEvents: 'none' }}>
        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            width: '42vw',
            height: '42vw',
            left: currentScene === 0 ? '66vw' : currentScene === 3 ? '3vw' : currentScene === 6 ? '40vw' : '54vw',
            top: currentScene === 3 ? '40vh' : currentScene === 6 ? '2vh' : '20vh',
            borderRadius: '50%',
            background: currentScene === 4 ? 'rgba(239,118,109,.08)' : 'rgba(98,231,214,.08)',
            filter: 'blur(2px)',
            zIndex: 0,
          }}
          animate={{ scale: currentScene === 2 ? 1.18 : 1, rotate: currentScene * 7 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            width: '19vw',
            height: '19vw',
            left: currentScene === 4 ? '73vw' : currentScene === 5 ? '11vw' : '29vw',
            top: currentScene === 5 ? '8vh' : '63vh',
            border: '1px solid rgba(245,187,100,.24)',
            borderRadius: '50%',
            zIndex: 0,
          }}
          animate={{ scale: [1, 1.08, 1], rotate: 90 + currentScene * 15 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="hud-label" style={{ position: 'absolute', left: '2.1vw', top: '50%', writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'rgba(227,238,229,.45)', letterSpacing: '.35em', zIndex: 3 }}>
          WEBCAM / GESTURE / ARCADE
        </div>
        <div style={{ position: 'absolute', left: '5.5vw', right: '5.5vw', top: '3.2vh', height: 2, background: 'rgba(227,238,229,.12)', zIndex: 4 }}>
          <motion.div
            style={{ height: '100%', background: currentScene === 4 ? 'var(--color-amber)' : 'var(--color-cyan)', transformOrigin: 'left' }}
            animate={{ width: `${((currentScene + 1) / Object.keys(SCENE_DURATIONS).length) * 100}%` }}
            transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="hud-label" style={{ position: 'absolute', right: '5.5vw', top: '4.4vh', color: 'rgba(227,238,229,.55)', zIndex: 4 }}>
          SEQUENCE {String(currentScene + 1).padStart(2, '0')} / 07
        </div>
      </SafeFrame>
      <AnimatePresence mode="sync" initial={false}>
        {currentScene === 0 && <Scene1 key="cold-open" />}
        {currentScene === 1 && <Scene2 key="tracking" />}
        {currentScene === 2 && <Scene3 key="gesture" />}
        {currentScene === 3 && <Scene4 key="field-test" />}
        {currentScene === 4 && <Scene5 key="safety" />}
        {currentScene === 5 && <Scene6 key="system" />}
        {currentScene === 6 && <Scene7 key="lockup" />}
      </AnimatePresence>
    </VideoCanvas>
  );
}
