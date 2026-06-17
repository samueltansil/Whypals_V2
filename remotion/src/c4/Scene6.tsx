import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONT, SAFE, SPRING_CONFIG, sceneFade } from './shared';

const DURATION = 150;

// 12 particles with different x positions, speeds, sizes
const PARTICLES = [
  { x: 0.08, speed: 1.0, r: 10, opacity: 0.6, delay: 0 },
  { x: 0.18, speed: 0.75, r: 8, opacity: 0.5, delay: 5 },
  { x: 0.28, speed: 1.2, r: 14, opacity: 0.7, delay: 10 },
  { x: 0.38, speed: 0.9, r: 10, opacity: 0.5, delay: 3 },
  { x: 0.48, speed: 1.1, r: 12, opacity: 0.6, delay: 8 },
  { x: 0.55, speed: 0.8, r: 8, opacity: 0.4, delay: 12 },
  { x: 0.62, speed: 1.3, r: 16, opacity: 0.8, delay: 2 },
  { x: 0.70, speed: 0.7, r: 10, opacity: 0.5, delay: 7 },
  { x: 0.78, speed: 1.0, r: 12, opacity: 0.6, delay: 4 },
  { x: 0.85, speed: 1.2, r: 8, opacity: 0.7, delay: 9 },
  { x: 0.92, speed: 0.85, r: 14, opacity: 0.5, delay: 6 },
  { x: 0.15, speed: 1.4, r: 10, opacity: 0.4, delay: 11 },
];

export const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterOpacity = sceneFade(frame, DURATION);

  // "Your home." spring
  const line1Progress = spring({ fps, frame: Math.max(0, frame - 10), config: SPRING_CONFIG, from: 0, to: 1 });
  // "Automated." spring
  const line2Progress = spring({ fps, frame: Math.max(0, frame - 22), config: SPRING_CONFIG, from: 0, to: 1 });
  // Separator line wipe
  const lineWipe = interpolate(frame, [40, 80], [0, 200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Bottom text
  const bottomProgress = spring({ fps, frame: Math.max(0, frame - 60), config: SPRING_CONFIG, from: 0, to: 1 });

  const CANVAS_W = 1080;
  const CANVAS_H = 1920;

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
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: SAFE.TOP,
        paddingBottom: SAFE.BOTTOM,
        paddingLeft: SAFE.SIDE,
        paddingRight: SAFE.SIDE,
        boxSizing: 'border-box',
      }}
    >
      {/* Particles */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      >
        {PARTICLES.map((p, i) => {
          const effectiveFrame = Math.max(0, frame - p.delay);
          const speed = p.speed * 3.5;
          const yPos = interpolate(
            effectiveFrame,
            [0, DURATION],
            [CANVAS_H - SAFE.BOTTOM - 50, SAFE.TOP + 100],
            { extrapolateRight: 'clamp' }
          );
          const xPos = p.x * CANVAS_W;
          const particleOpacity = interpolate(
            effectiveFrame,
            [0, 20, DURATION - 20, DURATION],
            [0, p.opacity, p.opacity, 0],
            { extrapolateRight: 'clamp' }
          );

          return (
            <circle
              key={i}
              cx={xPos}
              cy={yPos}
              r={p.r}
              fill={COLORS.BLUE}
              opacity={particleOpacity}
            />
          );
        })}
      </svg>

      {/* Main text */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            fontSize: FONT.H1,
            fontWeight: 800,
            color: COLORS.WHITE,
            opacity: line1Progress,
            transform: `translateY(${interpolate(line1Progress, [0, 1], [30, 0])}px)`,
            textAlign: 'center',
          }}
        >
          Your home.
        </div>

        <div
          style={{
            fontSize: FONT.H1,
            fontWeight: 800,
            color: COLORS.BLUE,
            opacity: line2Progress,
            transform: `translateY(${interpolate(line2Progress, [0, 1], [30, 0])}px)`,
            textAlign: 'center',
          }}
        >
          Automated.
        </div>

        {/* Separator */}
        <div
          style={{
            marginTop: 32,
            height: 2,
            width: lineWipe,
            background: COLORS.BLUE,
            borderRadius: 1,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            marginTop: 28,
            fontSize: FONT.BODY,
            fontWeight: 400,
            color: COLORS.GRAY,
            opacity: bottomProgress,
            transform: `translateY(${interpolate(bottomProgress, [0, 1], [15, 0])}px)`,
            textAlign: 'center',
          }}
        >
          Ask The Home Automation Store
        </div>
      </div>
    </div>
  );
};
