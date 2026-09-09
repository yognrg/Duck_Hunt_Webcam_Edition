// Optional scene metadata for Replit workspace integrations. When the
// workspace's scene controls are enabled for this project, a viewer's click on
// a scene segment scopes their next chat request to that scene's source file.
// Fill one entry per SCENE_DURATIONS key in VideoTemplate.tsx only when a
// skill reference asks for it; otherwise leave the map empty. Scenes missing
// from the map still play and can be jumped to.
//
// Example:
//   export const SCENE_DETAILS: Record<string, SceneDetails> = {
//     open: { title: 'Intro', filePath: 'src/components/video/video_scenes/Scene1.tsx' },
//   };

export interface SceneDetails {
  title: string;
  filePath: string;
}

export const SCENE_DETAILS: Record<string, SceneDetails> = {
  coldOpen: {
    title: 'Cold Open',
    filePath: 'src/components/video/video_scenes/Scene1.tsx',
  },
  tracking: {
    title: 'Hand Tracking',
    filePath: 'src/components/video/video_scenes/Scene2.tsx',
  },
  gesture: {
    title: 'Pinch to Shoot',
    filePath: 'src/components/video/video_scenes/Scene3.tsx',
  },
  fieldTest: {
    title: 'Field Test',
    filePath: 'src/components/video/video_scenes/Scene4.tsx',
  },
  safety: {
    title: 'Pause on No Hand',
    filePath: 'src/components/video/video_scenes/Scene5.tsx',
  },
  system: {
    title: 'System Readout',
    filePath: 'src/components/video/video_scenes/Scene6.tsx',
  },
  lockup: {
    title: 'Final Lockup',
    filePath: 'src/components/video/video_scenes/Scene7.tsx',
  },
};
