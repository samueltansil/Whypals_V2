import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONT, SAFE, SPRING_CONFIG, sceneFade } from './shared';

const DURATION = 180;

const APP_LABELS = ['Hue', 'TV', 'Ring', 'Nest', 'AV', 'Lock'];

// Start positions for each circle (spread around edges)
const START_POSITIONS = [
  { x: 0, y: -300 },   // top
  { x: 400, y: -300 },  // top right
  { x: -400, y: -300 }, // top left
  { x: 0, y: 300 },    // bottom
  { x: -400, y: 200 },  // bottom left
  { x: 400, y: 200 },   // bottom right
];

// Final positions in a 2x3 grid around center
const GRID_POSITIONS = [
  { x: -180, y: -160 },
  { x: 0, y: -160 },
  { x: 180, y: -160 },
  { x: -180, y: 20 },
  { x: 0, y: 20 },
  { x: 180, y: 20 },
];

// Center convergence
const CENTER_POSITIONS = [
  { x: -20, y: -20 },
  { x: 0, y: 0 },
  { x: 20, y: -20 },
  { x: -20, y: 20 },
  { x: 0, y: 10 },
  { x: 20, y: 20 },
];

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterOpacity = sceneFade(frame, DURATION);

  // Headline
  const headlineProgress = spring({ fps, frame, config: SPRING_CONFIG, from: 0, to: 1 });

  // Body text
  const bodyProgress = spring({ fps, frame: Math.max(0, frame - 15), config: SPRING_CONFIG, from: 0, to: 1 });

  // Big "4" reveal at frame 120
  const fourProgress = spring({ fps, frame: Math.max(0, frame - 120), config: SPRING_CONFIG, from: 0, to: 1 });
  const circlesFadeOut = interpolate(frame, [110, 130], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

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
      {/* Headline */}
      <div
        style={{
          fontSize: FONT.H2,
          fontWeight: 800,
          color: COLORS.WHITE,
          marginBottom: 20,
          opacity: headlineProgress,
          transform: `translateY(${interpolate(headlineProgress, [0, 1], [20, 0])}px)`,
          lineHeight: 1.15,
        }}
      >
        Too many apps. Too many remotes.
      </div>

      {/* Body */}
      <div
        style={{
          fontSize: FONT.BODY,
          fontWeight: 400,
          color: COLORS.GRAY,
          marginBottom: 60,
          opacity: bodyProgress,
          transform: `translateY(${interpolate(bodyProgress, [0, 1], [15, 0])}px)`,
          lineHeight: 1.5,
        }}
      >
        Your devices don't talk to each other. Control4 fixes that.
      </div>

      {/* Circle area */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* App circles */}
        <div style={{ opacity: circlesFadeOut, position: 'absolute', width: '100%', height: '100%' }}>
          {APP_LABELS.map((label, i) => {
            const startDelay = i * 8;
            const arriveProgress = spring({ fps, frame: Math.max(0, frame - startDelay), config: SPRING_CONFIG, from: 0, to: 1 });
            const convergeProgress = spring({ fps, frame: Math.max(0, frame - 90), config: SPRING_CONFIG, from: 0, to: 1 });

            const startX = START_POSITIONS[i].x;
            const startY = START_POSITIONS[i].y;
            const gridX = GRID_POSITIONS[i].x;
            const gridY = GRID_POSITIONS[i].y;
            const centerX = CENTER_POSITIONS[i].x;
            const centerY = CENTER_POSITIONS[i].y;

            // Phase 1: arrive to grid
            const currentX = interpolate(arriveProgress, [0, 1], [startX, gridX]);
            const currentY = interpolate(arriveProgress, [0, 1], [startY, gridY]);

            // Phase 2: converge to center
            const finalX = interpolate(convergeProgress, [0, 1], [currentX, centerX]);
            const finalY = interpolate(convergeProgress, [0, 1], [currentY, centerY]);

            return (
              <div
                key={label}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`,
                  opacity: arriveProgress,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: COLORS.CARD,
                  border: `2px solid ${COLORS.BLUE}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  color: COLORS.BLUE_L,
                }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Big "4" */}
        <div
          style={{
            position: 'absolute',
            fontSize: 200,
            fontWeight: 800,
            color: COLORS.BLUE,
            opacity: fourProgress,
            transform: `scale(${interpolate(fourProgress, [0, 1], [0.4, 1])})`,
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          4
        </div>
      </div>
    </div>
  );
};
