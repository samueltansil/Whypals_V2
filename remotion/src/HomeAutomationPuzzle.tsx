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

// ── Image & layout constants ──────────────────────────────────────────────────
const IMG_W = 2024;
const IMG_H = 722;
const SCALE = (1080 * 0.90) / IMG_W;   // ~0.480 — logo fills 90% of canvas width
const DISP_W = IMG_W * SCALE;           // ~972px
const DISP_H = IMG_H * SCALE;           // ~347px
const LOGO_LEFT = (1080 - DISP_W) / 2; // ~54px — horizontally centered
const LOGO_TOP = (1920 - DISP_H) / 2;  // ~787px — vertically centered

// ── Slice definitions (original image pixels) ─────────────────────────────────
// Adjust these x/y/w/h values if pieces don't line up perfectly in Studio
const SLICES = {
  leftHome:   { x: 0,   y: 0,   w: 312,  h: 390 }, // THE + H
  houseO:     { x: 312, y: 0,   w: 332,  h: 390 }, // house circle (the O)
  rightHome:  { x: 638, y: 0,   w: 462,  h: 390 }, // M + E
  automation: { x: 0,   y: 388, w: 2024, h: 180 }, // AUTOMATION row
  storeRow:   { x: 0,   y: 563, w: 2024, h: 159 }, // STORE + underline
};

// ── Piece component — renders a clipped window into the full logo PNG ─────────
interface PieceProps {
  clipX: number;
  clipY: number;
  clipW: number;
  clipH: number;
  transform?: string;
  opacity?: number;
}

const Piece: React.FC<PieceProps> = ({
  clipX, clipY, clipW, clipH,
  transform = "none",
  opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: LOGO_LEFT + clipX * SCALE,
      top: LOGO_TOP + clipY * SCALE,
      width: clipW * SCALE,
      height: clipH * SCALE,
      overflow: "hidden",
      opacity,
      transform,
    }}
  >
    {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
    <img
      src={LOGO_SRC}
      style={{
        position: "absolute",
        width: DISP_W,
        height: DISP_H,
        left: -clipX * SCALE,
        top: -clipY * SCALE,
        userSelect: "none",
        pointerEvents: "none",
      }}
    />
  </div>
);

// ── Main composition ──────────────────────────────────────────────────────────
export const HomeAutomationPuzzle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // House piece — center in final (settled) position
  const { x: hx, y: hy, w: hw, h: hh } = SLICES.houseO;
  const houseCX = LOGO_LEFT + hx * SCALE + (hw * SCALE) / 2;
  const houseCY = LOGO_TOP  + hy * SCALE + (hh * SCALE) / 2;
  // Translate so the element's center sits at screen center
  const dx = width  / 2 - houseCX;
  const dy = height / 2 - houseCY;

  // ── Phase 1 (0-15f): house pops in big at screen center ─────────────────
  const popSpring = spring({
    fps, frame,
    config: { damping: 14, stiffness: 180, mass: 0.5 },
    durationInFrames: 15,
  });
  const popScale   = interpolate(popSpring, [0, 1], [0, 2.6]);
  const popOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ── Phase 2 (15-48f): house snaps into O position ───────────────────────
  const snapSpring = spring({
    fps, frame: frame - 15,
    config: { damping: 11, stiffness: 115, mass: 0.85 },
    durationInFrames: 33,
  });
  const snapScale = interpolate(snapSpring, [0, 1], [2.6, 1]);
  const snapDX    = interpolate(snapSpring, [0, 1], [dx,  0]);
  const snapDY    = interpolate(snapSpring, [0, 1], [dy,  0]);

  // Pick phase
  const houseScale   = frame < 15 ? popScale   : snapScale;
  const houseTX      = frame < 15 ? dx         : snapDX;
  const houseTY      = frame < 15 ? dy         : snapDY;
  const houseOpacity = frame < 15 ? popOpacity : 1;
  const houseTransform = `translateX(${houseTX}px) translateY(${houseTY}px) scale(${houseScale})`;

  // ── THE + H, M + E spring in (frame 18) ─────────────────────────────────
  const sidesSpring = spring({
    fps, frame: frame - 18,
    config: { damping: 12, stiffness: 140, mass: 0.7 },
    durationInFrames: 30,
  });
  const leftShift   = interpolate(sidesSpring, [0, 1], [-380, 0]);
  const rightShift  = interpolate(sidesSpring, [0, 1], [ 380, 0]);
  const sidesOpacity = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ── AUTOMATION slides up (frame 48) ─────────────────────────────────────
  const autoSpring = spring({
    fps, frame: frame - 48,
    config: { damping: 15, stiffness: 130, mass: 0.7 },
    durationInFrames: 22,
  });
  const autoShift   = interpolate(autoSpring, [0, 1], [75, 0]);
  const autoOpacity = interpolate(frame, [48, 60], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ── STORE + underline slides up (frame 52, 4f delay) ─────────────────────
  const storeSpring = spring({
    fps, frame: frame - 52,
    config: { damping: 15, stiffness: 130, mass: 0.7 },
    durationInFrames: 22,
  });
  const storeShift   = interpolate(storeSpring, [0, 1], [75, 0]);
  const storeOpacity = interpolate(frame, [52, 65], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ── Scale pulse (90-105f) ────────────────────────────────────────────────
  const pulse =
    frame < 90  ? 1
    : frame < 97  ? interpolate(frame, [90, 97],  [1, 1.028], { easing: Easing.out(Easing.quad) })
    : frame < 105 ? interpolate(frame, [97, 105], [1.028, 1], { easing: Easing.out(Easing.quad) })
    : 1;

  // ── Fade to white (110-120f) ─────────────────────────────────────────────
  const fadeOut = interpolate(frame, [110, 120], [0, 1], {
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
          {...SLICES.leftHome}
          transform={`translateX(${leftShift}px)`}
          opacity={sidesOpacity}
        />

        {/* House icon (O) — pops in center then snaps to O position */}
        <Piece
          {...SLICES.houseO}
          transform={houseTransform}
          opacity={houseOpacity}
        />

        {/* M + E — slides in from right */}
        <Piece
          {...SLICES.rightHome}
          transform={`translateX(${rightShift}px)`}
          opacity={sidesOpacity}
        />

        {/* AUTOMATION — slides up */}
        <Piece
          {...SLICES.automation}
          transform={`translateY(${autoShift}px)`}
          opacity={autoOpacity}
        />

        {/* STORE + underline — slides up, slight delay */}
        <Piece
          {...SLICES.storeRow}
          transform={`translateY(${storeShift}px)`}
          opacity={storeOpacity}
        />
      </div>

      {/* Fade to white overlay */}
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
