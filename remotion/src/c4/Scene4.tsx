import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONT, SAFE, SPRING_CONFIG, sceneFade } from './shared';
import { BellIcon, SunIcon, BlindsIcon, TowelRailIcon, CoffeeIcon } from './icons';

const DURATION = 210;

const ITEMS = [
  { Icon: BellIcon, label: 'Alarm' },
  { Icon: SunIcon, label: 'Lights On' },
  { Icon: BlindsIcon, label: 'Blinds Open' },
  { Icon: TowelRailIcon, label: 'Towel Warmer' },
  { Icon: CoffeeIcon, label: 'Coffee Ready' },
];

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterOpacity = sceneFade(frame, DURATION);

  const headlineProgress = spring({ fps, frame, config: SPRING_CONFIG, from: 0, to: 1 });
  const bodyProgress = spring({ fps, frame: Math.max(0, frame - 12), config: SPRING_CONFIG, from: 0, to: 1 });

  // Clock appears at frame 20
  const clockProgress = spring({ fps, frame: Math.max(0, frame - 20), config: SPRING_CONFIG, from: 0, to: 1 });

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
        Wake up. Everything is already done.
      </div>

      {/* Body */}
      <div
        style={{
          fontSize: FONT.BODY,
          fontWeight: 400,
          color: COLORS.GRAY,
          marginBottom: 48,
          opacity: bodyProgress,
          transform: `translateY(${interpolate(bodyProgress, [0, 1], [15, 0])}px)`,
          lineHeight: 1.5,
        }}
      >
        6:30am triggers Control4. Your entire morning runs itself.
      </div>

      {/* Clock */}
      <div
        style={{
          opacity: clockProgress,
          transform: `scale(${interpolate(clockProgress, [0, 1], [0.7, 1])})`,
          marginBottom: 60,
          display: 'flex',
          alignItems: 'baseline',
          gap: 0,
        }}
      >
        <span
          style={{
            fontSize: 100,
            fontWeight: 800,
            color: COLORS.BLUE,
            fontFamily: "'Courier New', monospace",
            letterSpacing: 4,
            lineHeight: 1,
          }}
        >
          06:30
        </span>
        <span
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.BLUE_L,
            marginLeft: 16,
            opacity: 0.8,
          }}
        >
          AM
        </span>
      </div>

      {/* Icon grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          flex: 1,
        }}
      >
        {ITEMS.map((item, i) => {
          const startFrame = 50 + i * 20;
          const itemProgress = spring({
            fps,
            frame: Math.max(0, frame - startFrame),
            config: SPRING_CONFIG,
            from: 0,
            to: 1,
          });
          const itemY = interpolate(itemProgress, [0, 1], [20, 0]);

          return (
            <div
              key={i}
              style={{
                background: COLORS.CARD,
                borderRadius: 16,
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                opacity: itemProgress,
                transform: `translateY(${itemY}px)`,
                border: `1px solid ${COLORS.BLUE}33`,
                minHeight: 110,
              }}
            >
              <item.Icon size={48} color={COLORS.BLUE_L} />
              <div
                style={{
                  fontSize: FONT.LABEL,
                  fontWeight: 600,
                  color: COLORS.WHITE,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
