import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LOGO_SRC } from "./logoData";

// ── Canvas & image constants ──────────────────────────────────────────────────
const IMG_W = 2024;
const IMG_H = 722;
const LOGO_SCALE = (1080 * 0.88) / IMG_W;
const DISP_W = IMG_W * LOGO_SCALE;
const DISP_H = IMG_H * LOGO_SCALE;
const LOGO_LEFT = (1080 - DISP_W) / 2;
const LOGO_TOP = (1920 - DISP_H) / 2;

// ── Slice coordinates (original image px) ────────────────────────────────────
// If any piece looks misaligned in Studio, tweak x/y/w/h here
const S = {
  leftHome:   { x: 0,   y: 0,   w: 315,  h: 400 }, // THE + H
  houseO:     { x: 308, y: 0,   w: 320,  h: 400 }, // house icon / O
  rightHome:  { x: 614, y: 0,   w: 476,  h: 400 }, // M + E
  automation: { x: 0,   y: 395, w: 2024, h: 185 }, // AUTOMATION row
  storeLine:  { x: 0,   y: 573, w: 2024, h: 149 }, // STORE + blue line
};

// ── CSS sprite piece ──────────────────────────────────────────────────────────
interface PieceProps {
  x: number; y: number; w: number; h: number;
  transform?: string;
  opacity?: number;
}

const Piece: React.FC<PieceProps> = ({
  x, y, w, h,
  transform = "none",
  opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: LOGO_LEFT + x * LOGO_SCALE,
      top: LOGO_TOP + y * LOGO_SCALE,
      width: w * LOGO_SCALE,
      height: h * LOGO_SCALE,
      backgroundImage: `url(${LOGO_SRC})`,
      backgroundSize: `${DISP_W}px ${DISP_H}px`,
      backgroundPosition: `-${x * LOGO_SCALE}px -${y * LOGO_SCALE}px`,
      backgroundRepeat: "no-repeat",
      transform,
      transformOrigin: "center center",
      opacity,
    }}
  />
);

// ── Main composition ──────────────────────────────────────────────────────────
export const THASOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── House drops from above (0-42f) ───────────────────────────────────────
  const houseSpring = spring({
    fps,
    frame,
    config: { damping: 9, stiffness: 90, mass: 1.1 },
    durationInFrames: 42,
  });
  // Start 850px above final spot (just off top of screen), scale 1.8→1
  const houseDropY  = interpolate(houseSpring, [0, 1], [-850, 0]);
  const houseScale  = interpolate(houseSpring, [0, 1], [1.8, 1]);
  const houseOpacity = interpolate(frame, [0, 5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ── THE+H slides from left, M+E slides from right (8-46f) ────────────────
  const sidesSpring = spring({
    fps,
    frame: frame - 8,
    config: { damping: 11, stiffness: 120, mass: 0.8 },
    durationInFrames: 38,
  });
  const leftShift   = interpolate(sidesSpring, [0, 1], [-600, 0]);
  const rightShift  = interpolate(sidesSpring, [0, 1], [ 600, 0]);
  const sidesOpacity = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ── AUTOMATION rises from below (40-68f) ─────────────────────────────────
  const autoSpring = spring({
    fps,
    frame: frame - 40,
    config: { damping: 13, stiffness: 130, mass: 0.8 },
    durationInFrames: 28,
  });
  const autoShift   = interpolate(autoSpring, [0, 1], [180, 0]);
  const autoOpacity = interpolate(frame, [40, 52], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ── STORE + line rises from below, 6f after AUTOMATION (46-74f) ──────────
  const storeSpring = spring({
    fps,
    frame: frame - 46,
    config: { damping: 13, stiffness: 130, mass: 0.8 },
    durationInFrames: 28,
  });
  const storeShift   = interpolate(storeSpring, [0, 1], [180, 0]);
  const storeOpacity = interpolate(frame, [46, 58], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ── Whole-logo pulse (82-98f) ─────────────────────────────────────────────
  const pulse =
    frame < 82  ? 1
    : frame < 90  ? interpolate(frame, [82, 90],  [1, 1.035], { easing: Easing.out(Easing.sine) })
    : frame < 98  ? interpolate(frame, [90, 98],  [1.035, 1], { easing: Easing.out(Easing.sine) })
    : 1;

  // ── Fade to white (108-122f) ──────────────────────────────────────────────
  const fadeOut = interpolate(frame, [108, 122], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${pulse})`,
          transformOrigin: "center center",
        }}
      >
        {/* THE + H — slides in from left */}
        <Piece
          {...S.leftHome}
          transform={`translateX(${leftShift}px)`}
          opacity={sidesOpacity}
        />

        {/* House / O — drops from above with bounce */}
        <Piece
          {...S.houseO}
          transform={`translateY(${houseDropY}px) scale(${houseScale})`}
          opacity={houseOpacity}
        />

        {/* M + E — slides in from right */}
        <Piece
          {...S.rightHome}
          transform={`translateX(${rightShift}px)`}
          opacity={sidesOpacity}
        />

        {/* AUTOMATION — rises from below */}
        <Piece
          {...S.automation}
          transform={`translateY(${autoShift}px)`}
          opacity={autoOpacity}
        />

        {/* STORE + underline — rises from below, slight delay */}
        <Piece
          {...S.storeLine}
          transform={`translateY(${storeShift}px)`}
          opacity={storeOpacity}
        />
      </div>

      {/* White fade overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#FFFFFF",
          opacity: fadeOut,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
