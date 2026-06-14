import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  titleText: string;
  titleColor: string;
};

export const HelloWorld: React.FC<Props> = ({ titleText, titleColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const scale = spring({
    fps,
    frame,
    config: { damping: 10, stiffness: 100, mass: 0.5 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #FFF9F0 0%, #FFE4B5 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            color: titleColor,
            fontFamily: "Arial Rounded MT Bold, Arial, sans-serif",
            textShadow: "4px 4px 0px rgba(0,0,0,0.1)",
          }}
        >
          {titleText}
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#666",
            marginTop: 20,
            fontFamily: "Arial, sans-serif",
          }}
        >
          Learning made fun! 🦉
        </div>
      </div>
    </AbsoluteFill>
  );
};
