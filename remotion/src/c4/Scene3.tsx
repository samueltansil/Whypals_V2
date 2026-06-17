import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONT, SAFE, SPRING_CONFIG, sceneFade } from './shared';
import { ShieldIcon, CheckIcon, LockIcon } from './icons';

const DURATION = 180;

// House path total approximate length for dash animation
const HOUSE_PATH = 'M540 500 L880 750 L880 1300 L200 1300 L200 750 Z';
const HOUSE_PATH_LEN = 1600;

const CAMERA_POSITIONS = [
  { x: 220, y: 780 },
  { x: 860, y: 780 },
  { x: 540, y: 1280 },
];

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterOpacity = sceneFade(frame, DURATION);

  const headlineProgress = spring({ fps, frame, config: SPRING_CONFIG, from: 0, to: 1 });
  const bodyProgress = spring({ fps, frame: Math.max(0, frame - 12), config: SPRING_CONFIG, from: 0, to: 1 });

  // House draw: frames 10-50
  const houseDraw = interpolate(frame, [10, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const houseDash = interpolate(houseDraw, [0, 1], [HOUSE_PATH_LEN, 0]);

  // Shield: frame 50
  const shieldProgress = spring({ fps, frame: Math.max(0, frame - 50), config: SPRING_CONFIG, from: 0, to: 1 });

  // Notification card slide up: frame 100
  const cardProgress = spring({ fps, frame: Math.max(0, frame - 100), config: SPRING_CONFIG, from: 0, to: 1 });
  const cardY = interpolate(cardProgress, [0, 1], [80, 0]);

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
      }}
    >
      {/* Text section */}
      <div
        style={{
          paddingTop: SAFE.TOP,
          paddingLeft: SAFE.SIDE,
          paddingRight: SAFE.SIDE,
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 2,
        }}
      >
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
          Your home watches over itself.
        </div>
        <div
          style={{
            fontSize: FONT.BODY,
            fontWeight: 400,
            color: COLORS.GRAY,
            opacity: bodyProgress,
            transform: `translateY(${interpolate(bodyProgress, [0, 1], [15, 0])}px)`,
            lineHeight: 1.5,
          }}
        >
          Lock every door, arm the alarm, check every camera from anywhere in the world.
        </div>
      </div>

      {/* SVG House diagram */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0 }}
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
        fill="none"
      >
        {/* House outline */}
        <path
          d={HOUSE_PATH}
          stroke={COLORS.BLUE}
          strokeWidth="3"
          fill={`${COLORS.BLUE}0a`}
          strokeDasharray={HOUSE_PATH_LEN}
          strokeDashoffset={houseDash}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Shield at center */}
        <g
          transform={`translate(540, 900) scale(${shieldProgress})`}
          opacity={shieldProgress}
        >
          <foreignObject x="-60" y="-60" width="120" height="120">
            <ShieldIcon size={120} color={COLORS.BLUE} />
          </foreignObject>
        </g>

        {/* Camera circles at house corners */}
        {CAMERA_POSITIONS.map((pos, i) => {
          const camDelay = 60 + i * 8;
          const camProgress = spring({ fps, frame: Math.max(0, frame - camDelay), config: SPRING_CONFIG, from: 0, to: 1 });
          // Pulsing ring
          const pulseOpacity = interpolate(
            (frame - camDelay) % 30,
            [0, 15, 30],
            [0.8, 0.2, 0.8],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const pulseR = interpolate(
            (frame - camDelay) % 30,
            [0, 30],
            [20, 34],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <g key={i} opacity={camProgress}>
              {/* Pulse ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={pulseR * camProgress}
                stroke={COLORS.BLUE_L}
                strokeWidth="1.5"
                fill="none"
                opacity={pulseOpacity * camProgress}
              />
              {/* Camera dot */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={interpolate(camProgress, [0, 1], [0, 18])}
                fill={COLORS.BLUE}
                opacity={0.9}
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={interpolate(camProgress, [0, 1], [0, 8])}
                fill={COLORS.BLUE_L}
              />
            </g>
          );
        })}
      </svg>

      {/* Notification card */}
      <div
        style={{
          position: 'absolute',
          bottom: SAFE.BOTTOM + 40,
          left: SAFE.SIDE,
          right: SAFE.SIDE,
          opacity: cardProgress,
          transform: `translateY(${cardY}px)`,
          zIndex: 3,
        }}
      >
        <div
          style={{
            background: COLORS.CARD,
            borderRadius: 16,
            borderLeft: `4px solid ${COLORS.BLUE}`,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <LockIcon size={40} color={COLORS.BLUE_L} />
          <div style={{ flex: 1 }}>
            <div style={{ color: COLORS.WHITE, fontSize: 36, fontWeight: 600 }}>
              Front door locked
            </div>
            <div style={{ color: COLORS.GRAY, fontSize: 28, marginTop: 4 }}>
              Just now
            </div>
          </div>
          <CheckIcon size={36} />
        </div>
      </div>
    </div>
  );
};
