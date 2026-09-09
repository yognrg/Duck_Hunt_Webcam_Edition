import {
  SafeFrame,
  VideoCanvas,
  VideoPausedContext,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ComponentType } from 'react';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';

export const SCENE_DURATIONS = {
  coldOpen: 3800,
  tracking: 3900,
  gesture: 3600,
  fieldTest: 4700,
  safety: 3800,
  system: 4300,
  lockup: 4000,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  coldOpen: Scene1,
  tracking: Scene2,
  gesture: Scene3,
  fieldTest: Scene4,
  safety: Scene5,
  system: Scene6,
  lockup: Scene7,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Math.max(
    0,
    Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey),
  );
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} className="video-root">
        <SafeFrame
          style={{
            position: 'absolute',
            inset: 0,
            padding: 0,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              width: '42vw',
              height: '42vw',
              left:
                sceneIndex === 0
                  ? '66vw'
                  : sceneIndex === 3
                    ? '3vw'
                    : sceneIndex === 6
                      ? '40vw'
                      : '54vw',
              top:
                sceneIndex === 3
                  ? '40vh'
                  : sceneIndex === 6
                    ? '2vh'
                    : '20vh',
              borderRadius: '50%',
              background:
                sceneIndex === 4
                  ? 'rgba(239,118,109,.08)'
                  : 'rgba(98,231,214,.08)',
              filter: 'blur(2px)',
              zIndex: 0,
            }}
            animate={{
              scale: sceneIndex === 2 ? 1.18 : 1,
              rotate: sceneIndex * 7,
            }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              width: '19vw',
              height: '19vw',
              left:
                sceneIndex === 4
                  ? '73vw'
                  : sceneIndex === 5
                    ? '11vw'
                    : '29vw',
              top: sceneIndex === 5 ? '8vh' : '63vh',
              border: '1px solid rgba(245,187,100,.24)',
              borderRadius: '50%',
              zIndex: 0,
            }}
            animate={{
              scale: [1, 1.08, 1],
              rotate: 90 + sceneIndex * 15,
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div
            className="hud-label"
            style={{
              position: 'absolute',
              left: '2.1vw',
              top: '50%',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              color: 'rgba(227,238,229,.45)',
              letterSpacing: '.35em',
              zIndex: 3,
            }}
          >
            WEBCAM / GESTURE / ARCADE
          </div>
          <div
            style={{
              position: 'absolute',
              left: '5.5vw',
              right: '5.5vw',
              top: '3.2vh',
              height: 2,
              background: 'rgba(227,238,229,.12)',
              zIndex: 4,
            }}
          >
            <motion.div
              style={{
                height: '100%',
                background:
                  sceneIndex === 4
                    ? 'var(--color-amber)'
                    : 'var(--color-cyan)',
                transformOrigin: 'left',
              }}
              animate={{
                width: `${((sceneIndex + 1) / Object.keys(SCENE_DURATIONS).length) * 100}%`,
              }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div
            className="hud-label"
            style={{
              position: 'absolute',
              right: '5.5vw',
              top: '4.4vh',
              color: 'rgba(227,238,229,.55)',
              zIndex: 4,
            }}
          >
            SEQUENCE {String(sceneIndex + 1).padStart(2, '0')} / 07
          </div>
        </SafeFrame>
        <AnimatePresence mode="sync" initial={false}>
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
