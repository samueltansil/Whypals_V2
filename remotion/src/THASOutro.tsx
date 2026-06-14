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

// ── Canvas & scale ────────────────────────────────────────────────────────────
const IMG_W = 2024;
const IMG_H = 722;
const SC = (1080 * 0.88) / IMG_W;          // ≈ 0.469
const DW = IMG_W * SC;                      // displayed logo width  ≈ 950px
const DH = IMG_H * SC;                      // displayed logo height ≈ 339px
const OX = (1080 - DW) / 2;               // left offset ≈ 65px
const OY = (1920 - DH) / 2;               // top offset  ≈ 790px

// ── Slice coordinates (original image pixels) ─────────────────────────────────
// Tweak x/y/w/h if any piece shows the wrong region in Studio
const SLICES = {
  the:   { x: 0,    y: 0,   w: 95,   h: 395 }, // small "THE" left of HOME
  home:  { x: 95,   y: 0,   w: 1929, h: 395 }, // H + house + M + E
  auto:  { x: 0,    y: 390, w: 2024, h: 182 }, // AUTOMATION row
  store: { x: 1565, y: 572, w: 459,  h: 100 }, // STORE text (right side)
};

// Blue line is recreated in CSS so we get a clean left-to-right wipe
const LINE_LEFT   = OX;
const LINE_TOP    = OY + 640 * SC;   // ≈ y=640 in original image
const LINE_WIDTH  = 1560 * SC;       // stops just before STORE starts
const LINE_HEIGHT = Math.max(6, Math.round(22 * SC));
const LINE_COLOR  = "#1F6FB2";

// ── CSS sprite piece ──────────────────────────────────────────────────────────
interface PieceProps {
  x: number; y: number; w: number; h: number;
  transform?: string;
  opacity?: number;
}

const Piece: React.FC<PieceProps> = ({ x, y, w, h, transform = "none", opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left:   OX + x * SC,
      top:    OY + y * SC,
      width:  w * SC,
      height: h * SC,
      backgroundImage:    `url(${LOGO_SRC})`,
      backgroundSize:     `${DW}px ${DH}px`,
      backgroundPosition: `-${x * SC}px -${y * SC}px`,
      backgroundRepeat:   "no-repeat",
      transform,
      transformOrigin: "center center",
      opacity,
    }}
  />
);

// ── Composition ───────────────────────────────────────────────────────────────
export const THASOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Snappy spring — settles fast, minimal overshoot
  const snap = (startF: number) =>
    spring({ fps, frame: frame - startF, config: { damping: 20, stiffness: 180, mass: 0.55 }, durationInFrames: 20 });

  // ── 1. "THE" — fades up from 18px below (0-20f) ──────────────────────────
  const theSp = snap(0);
  const theOp = interpolate(theSp, [0, 1], [0, 1]);
  const theY  = interpolate(theSp, [0, 1], [18, 0]);

  // ── 2. "HOME" — fades down from 18px above (14-34f) ──────────────────────
  const homeSp = snap(14);
  const homeOp = interpolate(homeSp, [0, 1], [0, 1]);
  const homeY  = interpolate(homeSp, [0, 1], [-18, 0]);

  // ── 3. "AUTOMATION" — fades up from 18px below (28-48f) ──────────────────
  const autoSp = snap(28);
  const autoOp = interpolate(autoSp, [0, 1], [0, 1]);
  const autoY  = interpolate(autoSp, [0, 1], [18, 0]);

  // ── 4. "STORE" — slides in 24px from right (42-62f) ─────────────────────
  const storeSp = snap(42);
  const storeOp = interpolate(storeSp, [0, 1], [0, 1]);
  const storeX  = interpolate(storeSp, [0, 1], [24, 0]);

  // ── 5. Blue line — wipes left→right (54-76f) ─────────────────────────────
  const lineW = interpolate(frame, [54, 76], [0, LINE_WIDTH], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // ── Subtle pulse (82-98f) ─────────────────────────────────────────────────
  const pulse =
    frame < 82  ? 1
    : frame < 90  ? interpolate(frame, [82, 90],  [1, 1.03],  { easing: Easing.out(Easing.sin) })
    : frame < 98  ? interpolate(frame, [90, 98],  [1.03, 1],  { easing: Easing.out(Easing.sin) })
    : 1;

  // ── Fade to white (108-122f) ──────────────────────────────────────────────
  const fadeOut = interpolate(frame, [108, 122], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${pulse})`, transformOrigin: "center center" }}>

        {/* 1 — THE */}
        <Piece {...SLICES.the}
          opacity={theOp}
          transform={`translateY(${theY}px)`}
        />

        {/* 2 — HOME */}
        <Piece {...SLICES.home}
          opacity={homeOp}
          transform={`translateY(${homeY}px)`}
        />

        {/* 3 — AUTOMATION */}
        <Piece {...SLICES.auto}
          opacity={autoOp}
          transform={`translateY(${autoY}px)`}
        />

        {/* 4 — STORE */}
        <Piece {...SLICES.store}
          opacity={storeOp}
          transform={`translateX(${storeX}px)`}
        />

        {/* 5 — Blue line wipe */}
        <div style={{
          position: "absolute",
          left:            LINE_LEFT,
          top:             LINE_TOP,
          height:          LINE_HEIGHT,
          width:           lineW,
          backgroundColor: LINE_COLOR,
          borderRadius:    2,
        }} />

      </div>

      {/* White fade overlay */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#FFFFFF", opacity: fadeOut, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
