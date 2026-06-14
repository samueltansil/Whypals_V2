import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const BLUE = "#1F6FB2";
const GRAY = "#A6A8AB";
const BG = "#FFFFFF";

interface HouseIconProps {
  size: number;
  strokeProgress: number;
  circleOpacity: number;
}

const HouseIcon: React.FC<HouseIconProps> = ({ size, strokeProgress, circleOpacity }) => {
  // Roof path M 17 50 L 50 20 L 83 50 — length ≈ 82 units
  const roofLen = 82;
  const dashOffset = roofLen * (1 - Math.min(1, strokeProgress));
  const detailOpacity = Math.max(0, (strokeProgress - 0.6) / 0.4);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", overflow: "visible" }}
    >
      <circle cx="50" cy="52" r="44" fill={BLUE} opacity={circleOpacity} />
      <path
        d="M 17 50 L 50 20 L 83 50"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={roofLen}
        strokeDashoffset={dashOffset}
      />
      {/* Chimney */}
      <rect x="61" y="22" width="9" height="16" fill="white" opacity={detailOpacity} rx="1" />
      {/* Door */}
      <rect x="41" y="57" width="18" height="20" fill="white" opacity={detailOpacity} rx="2" />
    </svg>
  );
};

export const HomeAutomationOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ── Layout constants ──────────────────────────────────────────────────────
  const LEFT = 130;
  const HOME_FS = 170;
  const AUTO_FS = 100;
  const STORE_FS = 72;

  const homeY = 700;
  const autoY = homeY + HOME_FS + 28;
  const storeY = autoY + AUTO_FS + 10;
  const underlineY = storeY + STORE_FS + 20;

  // Approximate letter widths for Arial Black at HOME_FS
  const LW_H = 122, LW_O = 128, LW_M = 150, LW_E = 108;
  const LS = 14;
  const oLeft = LEFT + LW_H + LS;
  const mLeft = oLeft + LW_O + LS;
  const eLeft = mLeft + LW_M + LS;
  const oCenterX = oLeft + LW_O / 2;
  const oCenterY = homeY + HOME_FS / 2;

  const UNDERLINE_W = 820;

  // ── Phase 1 (0-20f): House draws on ──────────────────────────────────────
  const strokeProgress = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const circleOpacity = interpolate(frame, [4, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Phase 2 (20-45f): House moves to O, letters snap in ──────────────────
  const houseSpring = spring({
    fps,
    frame: frame - 20,
    config: { damping: 12, stiffness: 130, mass: 0.7 },
    durationInFrames: 25,
  });

  const houseSize = interpolate(houseSpring, [0, 1], [260, HOME_FS + 8]);
  const houseCX = interpolate(houseSpring, [0, 1], [width / 2, oCenterX]);
  const houseCY = interpolate(houseSpring, [0, 1], [height / 2, oCenterY]);

  const lettersSpring = spring({
    fps,
    frame: frame - 22,
    config: { damping: 13, stiffness: 155, mass: 0.6 },
    durationInFrames: 23,
  });

  const hShift = interpolate(lettersSpring, [0, 1], [-260, 0]);
  const mShift = interpolate(lettersSpring, [0, 1], [260, 0]);
  const eShift = interpolate(lettersSpring, [0, 1], [360, 0]);
  const lettersOpacity = interpolate(frame, [22, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Phase 3 (45-70f): AUTOMATION, STORE, THE ─────────────────────────────
  const autoSpring = spring({
    fps,
    frame: frame - 45,
    config: { damping: 15, stiffness: 135, mass: 0.7 },
    durationInFrames: 25,
  });
  const autoShift = interpolate(autoSpring, [0, 1], [55, 0]);
  const autoOpacity = interpolate(frame, [45, 57], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const storeSpring = spring({
    fps,
    frame: frame - 48,
    config: { damping: 15, stiffness: 135, mass: 0.7 },
    durationInFrames: 22,
  });
  const storeShift = interpolate(storeSpring, [0, 1], [55, 0]);
  const storeOpacity = interpolate(frame, [48, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const theOpacity = interpolate(frame, [46, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Phase 4 (70-90f): Underline wipe ─────────────────────────────────────
  const lineProgress = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // ── Phase 5 (90-105f): Scale pulse ───────────────────────────────────────
  const pulse =
    frame < 90 ? 1
    : frame < 97 ? interpolate(frame, [90, 97], [1, 1.03], { easing: Easing.out(Easing.quad) })
    : frame < 105 ? interpolate(frame, [97, 105], [1.03, 1], { easing: Easing.out(Easing.quad) })
    : 1;

  // ── Phase 6 (110-120f): Fade to white ────────────────────────────────────
  const fadeOut = interpolate(frame, [110, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${pulse})`,
          transformOrigin: "center center",
        }}
      >
        {/* THE — vertical stack, left of HOME */}
        <div
          style={{
            position: "absolute",
            left: LEFT - 50,
            top: homeY + 6,
            opacity: theOpacity,
            fontSize: 36,
            fontWeight: 900,
            fontFamily: "'Arial Black', Arial, sans-serif",
            color: GRAY,
            writingMode: "vertical-lr",
            transform: "rotate(180deg)",
            letterSpacing: 6,
            lineHeight: 1,
          }}
        >
          THE
        </div>

        {/* H */}
        <div
          style={{
            position: "absolute",
            left: LEFT + hShift,
            top: homeY,
            fontSize: HOME_FS,
            fontWeight: 900,
            fontFamily: "'Arial Black', Arial, sans-serif",
            color: BLUE,
            opacity: lettersOpacity,
            lineHeight: 1,
          }}
        >
          H
        </div>

        {/* House icon as O */}
        <div
          style={{
            position: "absolute",
            left: houseCX - houseSize / 2,
            top: houseCY - houseSize / 2,
            width: houseSize,
            height: houseSize,
          }}
        >
          <HouseIcon
            size={houseSize}
            strokeProgress={strokeProgress}
            circleOpacity={circleOpacity}
          />
        </div>

        {/* M */}
        <div
          style={{
            position: "absolute",
            left: mLeft + mShift,
            top: homeY,
            fontSize: HOME_FS,
            fontWeight: 900,
            fontFamily: "'Arial Black', Arial, sans-serif",
            color: BLUE,
            opacity: lettersOpacity,
            lineHeight: 1,
          }}
        >
          M
        </div>

        {/* E */}
        <div
          style={{
            position: "absolute",
            left: eLeft + eShift,
            top: homeY,
            fontSize: HOME_FS,
            fontWeight: 900,
            fontFamily: "'Arial Black', Arial, sans-serif",
            color: BLUE,
            opacity: lettersOpacity,
            lineHeight: 1,
          }}
        >
          E
        </div>

        {/* AUTOMATION */}
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: autoY + autoShift,
            fontSize: AUTO_FS,
            fontWeight: 900,
            fontFamily: "'Arial Black', Arial, sans-serif",
            color: GRAY,
            opacity: autoOpacity,
            lineHeight: 1,
            letterSpacing: 10,
          }}
        >
          AUTOMATION
        </div>

        {/* STORE — right-aligned with underline */}
        <div
          style={{
            position: "absolute",
            right: width - (LEFT + UNDERLINE_W),
            top: storeY + storeShift,
            fontSize: STORE_FS,
            fontWeight: 900,
            fontFamily: "'Arial Black', Arial, sans-serif",
            color: GRAY,
            opacity: storeOpacity,
            lineHeight: 1,
            letterSpacing: 8,
          }}
        >
          STORE
        </div>

        {/* Underline wipe */}
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: underlineY,
            height: 7,
            width: UNDERLINE_W * lineProgress,
            backgroundColor: BLUE,
            borderRadius: 3,
          }}
        />
      </div>

      {/* White fade overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: BG,
          opacity: fadeOut,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
