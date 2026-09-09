import {
  ChevronDown,
  ChevronUp,
  Lock,
  Pause,
  Play,
  Repeat,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import VideoTemplate, {
  SCENE_DURATIONS,
} from '@/components/video/VideoTemplate';
import { SCENE_DETAILS } from '@/components/video/sceneMeta';

import { useSceneControls } from './useSceneControls';

const PROGRESS_TICK_MS = 60;

function formatPlaybackTime(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function announceSceneSelection(index: number, sceneKeys: string[]) {
  const key = sceneKeys[index];
  const details = SCENE_DETAILS[key];
  if (!details?.filePath) return;

  window.parent.postMessage(
    {
      type: 'REPLIT_VIDEO_SCENE_SELECTED',
      payload: {
        sceneIndex: index,
        sceneCount: sceneKeys.length,
        sceneTitle: details.title || key,
        filePath: details.filePath,
        lineNumber: 1,
      },
    },
    '*',
  );
}

function PlaybackStatus({
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  paused,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;

    const startedAt = performance.now();
    const intervalId = window.setInterval(() => {
      setElapsed(elapsedBaseRef.current + (performance.now() - startedAt));
    }, PROGRESS_TICK_MS);

    return () => {
      window.clearInterval(intervalId);
      elapsedBaseRef.current += performance.now() - startedAt;
    };
  }, [paused, tick]);

  const progress =
    activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(
    totalDuration,
    activeStartTime + Math.min(elapsed, activeDuration),
  );

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {sceneKeys.map((key, index) => {
          const isActive = index === activeIndex;
          const fill = isActive ? progress * 100 : 0;
          return (
            <button
              key={key}
              onClick={() => onJumpTo(index)}
              className="relative h-3 min-h-3 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20 transition-all hover:h-4 hover:bg-white/30"
              aria-label={`Jump to scene ${index + 1}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-[#62e7d6] transition-[width] duration-100"
                style={{ width: `${fill}%` }}
              />
            </button>
          );
        })}
      </div>

      <div className="shrink-0 font-mono text-sm tabular-nums text-white/70">
        {activeIndex + 1}/{sceneKeys.length}
      </div>

      <div
        className="min-w-[9ch] shrink-0 text-right font-mono text-sm tabular-nums text-white/80"
        role="timer"
        aria-label={`Playback time ${formatPlaybackTime(totalElapsed)} of ${formatPlaybackTime(totalDuration)}`}
      >
        {formatPlaybackTime(totalElapsed)} / {formatPlaybackTime(totalDuration)}
      </div>
    </>
  );
}

function ControlBar({
  visible,
  collapsed,
  locked,
  paused,
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  onTogglePause,
  onToggleLock,
  onJumpTo,
  onToggleCollapsed,
}: {
  visible: boolean;
  collapsed: boolean;
  locked: boolean;
  paused: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  onTogglePause: () => void;
  onToggleLock: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 bg-[#071417]/90 px-3 py-2 backdrop-blur-md transition-all duration-200 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-full opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <button
        onClick={onTogglePause}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        title={paused ? 'Play' : 'Pause'}
        aria-label={paused ? 'Play' : 'Pause'}
      >
        {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
      </button>

      <button
        onClick={onToggleLock}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
          locked
            ? 'bg-[#62e7d6]/15 text-[#62e7d6]'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
        title={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
        aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
        aria-pressed={locked}
      >
        {locked ? <Lock className="h-4 w-4" /> : <Repeat className="h-5 w-5" />}
      </button>

      <div className="h-7 w-px shrink-0 bg-white/15" aria-hidden="true" />

      <PlaybackStatus
        sceneKeys={sceneKeys}
        activeIndex={activeIndex}
        activeDuration={activeDuration}
        activeStartTime={activeStartTime}
        totalDuration={totalDuration}
        tick={tick}
        paused={paused}
        onJumpTo={onJumpTo}
      />

      <button
        onClick={onToggleCollapsed}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        title={collapsed ? 'Show controls' : 'Hide controls'}
        aria-label={collapsed ? 'Show controls' : 'Hide controls'}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

export default function VideoWithControls() {
  const isIframed =
    typeof window !== 'undefined' && window.self !== window.top;
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);

  const {
    sceneKeys,
    activeIndex,
    locked,
    paused,
    mountKey,
    tick,
    durations,
    activeDuration,
    activeStartTime,
    totalDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
    togglePause,
  } = useSceneControls(SCENE_DURATIONS);

  const handleJumpTo = useCallback(
    (index: number) => {
      jumpTo(index);
      announceSceneSelection(index, sceneKeys);
    },
    [jumpTo, sceneKeys],
  );

  useEffect(() => {
    if (!paused) return;

    const runningAnimations = document
      .getAnimations()
      .filter((animation) => animation.playState === 'running');
    runningAnimations.forEach((animation) => animation.pause());

    return () => {
      runningAnimations.forEach((animation) => animation.play());
    };
  }, [paused]);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      const sensor = sensorRef.current;
      if (sensor && !sensor.contains(event.target as Node)) {
        setTapPinned(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () =>
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
  }, [collapsed, tapPinned]);

  if (!isIframed) return <VideoTemplate />;

  const barVisible = !collapsed || hovering || tapPinned;

  return (
    <div className="relative h-screen w-full">
      <VideoTemplate
        key={mountKey}
        durations={durations}
        loop
        paused={paused}
        onSceneChange={onSceneChange}
      />

      <div
        ref={sensorRef}
        className="absolute bottom-0 left-0 right-0 z-50 flex h-[25%] flex-col justify-end"
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHovering(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setHovering(false);
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true);
        }}
      >
        <div className="w-full flex-1" aria-hidden="true" />
        <ControlBar
          visible={barVisible}
          collapsed={collapsed}
          locked={locked}
          paused={paused}
          sceneKeys={sceneKeys}
          activeIndex={activeIndex}
          activeDuration={activeDuration}
          activeStartTime={activeStartTime}
          totalDuration={totalDuration}
          tick={tick}
          onTogglePause={togglePause}
          onToggleLock={toggleLock}
          onJumpTo={handleJumpTo}
          onToggleCollapsed={() => {
            setCollapsed((value) => {
              if (!value) {
                setHovering(false);
                setTapPinned(false);
              }
              return !value;
            });
          }}
        />
      </div>
    </div>
  );
}