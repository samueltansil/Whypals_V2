import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONT, SAFE, SPRING_CONFIG, sceneFade } from './shared';

const DURATION = 180;

const lines = [
  { text: 'You walk through your front door.', color: COLORS.WHITE },
  { text: 'The lights turn on. The music plays.', color: COLORS.WHITE },
  { text: 'The temperature is perfect.', color: COLORS.WHITE },
  { text: "You didn't touch a thing.", color: COLORS.BLUE_L },
];

export const Scene0: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterOpacity = sceneFade(frame, DURATION);

  // Headline spring
  const headlineProgress = spring({ fps, frame, config: SPRING_CONFIG, from: 0, to: 1 });
  const headlineY = interpolate(headlineProgress, [0, 1], [30, 0]);

  // Background house opacity
  const houseFade = interpolate(frame, [0, 60], [0, 0.15], { extrapolateRight: 'clamp' });

  // Blue bar wipe (starts at frame 100)
  const barWidth = interpolate(frame, [100, 160], [0, 800], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: COLORS.BG,
        opacity: masterOpacity,
        fontFamily: FONT.FAMILY,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: SAFE.TOP,
        paddingLeft: SAFE.SIDE,
        paddingRight: SAFE.SIDE,
        paddingBottom: SAFE.BOTTOM,
        boxSizing: 'border-box',
      }}
    >
      {/* House silhouette background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: houseFade, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 1080 1920" fill="none" preserveAspectRatio="xMidYMid meet">
          <path
            d="M540 400 L900 700 L900 1400 L180 1400 L180 700 Z"
            stroke={COLORS.BLUE}
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M400 1400 L400 1100 L540 1100 L540 1400"
            stroke={COLORS.BLUE}
            strokeWidth="2"
            fill="none"
          />
          <rect x="650" y="900" width="120" height="120" stroke={COLORS.BLUE} strokeWidth="2" fill="none" />
          <rect x="310" y="900" width="120" height="120" stroke={COLORS.BLUE} strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: FONT.H1,
          fontWeight: 800,
          color: COLORS.WHITE,
          marginBottom: 56,
          transform: `translateY(${headlineY}px)`,
          opacity: headlineProgress,
          lineHeight: 1.1,
        }}
      >
        Picture this.
      </div>

      {/* Lines staggered */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1 }}>
        {lines.map((line, i) => {
          const startFrame = 30 + i * 20;
          const lineProgress = spring({
            fps,
            frame: Math.max(0, frame - startFrame),
            config: SPRING_CONFIG,
            from: 0,
            to: 1,
          });
          const lineY = interpolate(lineProgress, [0, 1], [20, 0]);
          return (
            <div
              key={i}
              style={{
                fontSize: FONT.BODY,
                fontWeight: 400,
                color: line.color,
                transform: `translateY(${lineY}px)`,
                opacity: lineProgress,
                lineHeight: 1.4,
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>

      {/* Blue accent bar */}
      <div
        style={{
          position: 'absolute',
          bottom: SAFE.BOTTOM + 40,
          left: SAFE.SIDE,
          height: 4,
          width: barWidth,
          background: COLORS.BLUE,
          borderRadius: 2,
        }}
      />
    </div>
  );
};
