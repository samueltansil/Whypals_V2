import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONT, SAFE, SPRING_CONFIG, sceneFade } from './shared';

const DURATION = 180;

const SCENE_BUTTONS = [
  { label: 'Morning', filled: true },
  { label: 'Movie Night', filled: false },
  { label: 'Away', filled: false },
  { label: 'Security On', filled: false },
];

export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterOpacity = sceneFade(frame, DURATION);

  const headlineProgress = spring({ fps, frame, config: SPRING_CONFIG, from: 0, to: 1 });
  const bodyProgress = spring({ fps, frame: Math.max(0, frame - 12), config: SPRING_CONFIG, from: 0, to: 1 });

  // Phone frame appears at frame 10
  const phoneProgress = spring({ fps, frame: Math.max(0, frame - 10), config: SPRING_CONFIG, from: 0, to: 1 });

  // Phone dimensions
  const PHONE_W = 280;
  const PHONE_H = 520;

  // Tap animation: each button taps in sequence, ~20f after appearing
  const getTapScale = (buttonIndex: number) => {
    const buttonAppearFrame = 35 + buttonIndex * 12;
    const tapFrame = buttonAppearFrame + 20;
    const tapProgress = spring({
      fps,
      frame: Math.max(0, frame - tapFrame),
      config: { damping: 100, stiffness: 400, mass: 0.5 },
      from: 0,
      to: 1,
    });
    // Scale: 1 -> 0.92 -> 1 using a half-cycle spring
    return interpolate(tapProgress, [0, 0.4, 1], [1, 0.92, 1], { extrapolateRight: 'clamp' });
  };

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
        Control it all from one place.
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
        One app runs your entire home. Scenes, schedules, security.
      </div>

      {/* Phone + content centered */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: PHONE_W,
            height: PHONE_H,
            opacity: phoneProgress,
            transform: `scale(${interpolate(phoneProgress, [0, 1], [0.8, 1])})`,
            position: 'relative',
          }}
        >
          {/* Phone outer shell */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 36,
              border: `3px solid ${COLORS.WHITE}`,
              background: COLORS.CARD,
              overflow: 'hidden',
            }}
          >
            {/* Status bar area */}
            <div
              style={{
                height: 32,
                background: `${COLORS.BLUE}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 6,
                  borderRadius: 3,
                  background: COLORS.GRAY,
                  opacity: 0.4,
                }}
              />
            </div>

            {/* App title */}
            <div
              style={{
                padding: '16px 20px 12px',
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.WHITE,
                borderBottom: `1px solid ${COLORS.BLUE}33`,
              }}
            >
              Control4
            </div>

            {/* Scene buttons */}
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {SCENE_BUTTONS.map((btn, i) => {
                const startDelay = 35 + i * 12;
                const btnProgress = spring({
                  fps,
                  frame: Math.max(0, frame - startDelay),
                  config: SPRING_CONFIG,
                  from: 0,
                  to: 1,
                });
                const tapScale = getTapScale(i);

                return (
                  <div
                    key={i}
                    style={{
                      opacity: btnProgress,
                      transform: `translateY(${interpolate(btnProgress, [0, 1], [12, 0])}px) scale(${tapScale})`,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 50,
                        padding: '12px 20px',
                        background: btn.filled ? COLORS.BLUE : 'transparent',
                        border: `1.5px solid ${COLORS.BLUE}`,
                        color: btn.filled ? COLORS.WHITE : COLORS.BLUE_L,
                        fontSize: 22,
                        fontWeight: btn.filled ? 700 : 500,
                        textAlign: 'center',
                      }}
                    >
                      {btn.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Home button */}
          <div
            style={{
              position: 'absolute',
              bottom: -24,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: `2px solid ${COLORS.WHITE}`,
              background: COLORS.CARD,
              opacity: phoneProgress * 0.6,
            }}
          />
        </div>
      </div>
    </div>
  );
};
