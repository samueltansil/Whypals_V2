import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { COLORS } from './shared';
import { Scene0 } from './Scene0';
import { Scene1 } from './Scene1';
import { Scene2 } from './Scene2';
import { Scene3 } from './Scene3';
import { Scene4 } from './Scene4';
import { Scene5 } from './Scene5';
import { Scene6 } from './Scene6';

export const Control4Explainer: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.BG }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');`}</style>

      {/* Scene 0: Hook — frames 0-180 (6s) */}
      <Sequence from={0} durationInFrames={180}>
        <Scene0 />
      </Sequence>

      {/* Scene 1: Too Many Apps — frames 180-360 (6s) */}
      <Sequence from={180} durationInFrames={180}>
        <Scene1 />
      </Sequence>

      {/* Scene 2: One Brain — frames 360-540 (6s) */}
      <Sequence from={360} durationInFrames={180}>
        <Scene2 />
      </Sequence>

      {/* Scene 3: Security — frames 540-720 (6s) */}
      <Sequence from={540} durationInFrames={180}>
        <Scene3 />
      </Sequence>

      {/* Scene 4: Morning Automation — frames 720-930 (7s) */}
      <Sequence from={720} durationInFrames={210}>
        <Scene4 />
      </Sequence>

      {/* Scene 5: One App — frames 930-1110 (6s) */}
      <Sequence from={930} durationInFrames={180}>
        <Scene5 />
      </Sequence>

      {/* Scene 6: Finale — frames 1110-1260 (5s) */}
      <Sequence from={1110} durationInFrames={150}>
        <Scene6 />
      </Sequence>
    </AbsoluteFill>
  );
};
