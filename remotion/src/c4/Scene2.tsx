import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONT, SAFE, SPRING_CONFIG, sceneFade } from './shared';
import { BulbIcon, TVIcon, LockIcon, CameraIcon, ThermostatIcon } from './icons';

const DURATION = 180;

// Each spoke: angle in degrees, label, icon component, line length
const SPOKES = [
  { angle: -90, label: 'Lights', Icon: BulbIcon, lineLen: 220, appearDelay: 15 },
  { angle: -30, label: 'TV', Icon: TVIcon, lineLen: 220, appearDelay: 30 },
  { angle: 30, label: 'Security', Icon: LockIcon, lineLen: 220, appearDelay: 45 },
  { angle: 90, label: 'Camera', Icon: CameraIcon, lineLen: 220, appearDelay: 60 },
  { angle: 150, label: 'Climate', Icon: ThermostatIcon, lineLen: 220, appearDelay: 75 },
];

const degToRad = (d: number) => (d * Math.PI) / 180;

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterOpacity = sceneFade(frame, DURATION);

  const headlineProgress = spring({ fps, frame, config: SPRING_CONFIG, from: 0, to: 1 });
  const bodyProgress = spring({ fps, frame: Math.max(0, frame - 12), config: SPRING_CONFIG, from: 0, to: 1 });
  const boxProgress = spring({ fps, frame: Math.max(0, frame - 5), config: SPRING_CONFIG, from: 0, to: 1 });

  // SVG diagram center
  const CX = 540;
  const CY = 1200;
  const BOX_W = 240;
  const BOX_H = 80;
  const LINE_START = 160; // distance from center where line starts (outside box)

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
          One brain runs your entire home.
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
          The Control4 Controller connects every device, wired or wireless.
        </div>
      </div>

      {/* SVG Diagram */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0 }}
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
        fill="none"
      >
        {/* Controller box */}
        <g opacity={boxProgress} transform={`translate(${CX}, ${CY}) scale(${interpolate(boxProgress, [0, 1], [0.5, 1])})`}>
          <rect
            x={-BOX_W / 2}
            y={-BOX_H / 2}
            width={BOX_W}
            height={BOX_H}
            rx="12"
            fill={COLORS.CARD}
            stroke={COLORS.BLUE}
            strokeWidth="2.5"
          />
          <text
            x="0"
            y="7"
            textAnchor="middle"
            fill={COLORS.BLUE_L}
            fontSize="20"
            fontWeight="700"
            fontFamily={FONT.FAMILY}
            letterSpacing="3"
          >
            CONTROL4
          </text>
        </g>

        {/* Spokes */}
        {SPOKES.map((spoke, i) => {
          const rad = degToRad(spoke.angle);
          const x1 = CX + Math.cos(rad) * (BOX_W / 2 + 16);
          const y1 = CY + Math.sin(rad) * (BOX_H / 2 + 16);
          const x2 = CX + Math.cos(rad) * (LINE_START + spoke.lineLen);
          const y2 = CY + Math.sin(rad) * (LINE_START + spoke.lineLen);

          // Line draw animation
          const lineDrawProgress = interpolate(
            frame,
            [spoke.appearDelay, spoke.appearDelay + 40],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          // Total line length approx
          const totalLen = spoke.lineLen;
          const dashOffset = interpolate(lineDrawProgress, [0, 1], [totalLen, 0]);

          // Icon pop-in
          const iconProgress = spring({
            fps,
            frame: Math.max(0, frame - (spoke.appearDelay + 35)),
            config: SPRING_CONFIG,
            from: 0,
            to: 1,
          });

          const iconX = CX + Math.cos(rad) * (LINE_START + spoke.lineLen + 50);
          const iconY = CY + Math.sin(rad) * (LINE_START + spoke.lineLen + 50);
          const labelX = CX + Math.cos(rad) * (LINE_START + spoke.lineLen + 110);
          const labelY = CY + Math.sin(rad) * (LINE_START + spoke.lineLen + 110);

          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={COLORS.BLUE}
                strokeWidth="2"
                strokeDasharray={totalLen}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
              <g
                transform={`translate(${iconX}, ${iconY}) scale(${iconProgress})`}
                opacity={iconProgress}
              >
                <foreignObject x="-24" y="-24" width="48" height="48">
                  <spoke.Icon size={48} color={COLORS.BLUE_L} />
                </foreignObject>
              </g>
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={COLORS.GRAY}
                fontSize={FONT.LABEL}
                fontFamily={FONT.FAMILY}
                opacity={iconProgress}
              >
                {spoke.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
