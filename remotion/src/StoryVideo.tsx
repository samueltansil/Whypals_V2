import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";

type Props = {
  title: string;
  content: string;
  backgroundColor: string;
};

const TitleCard: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const slideUp = interpolate(frame, [0, 30], [40, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(180deg, #FF6B6B 0%, #FF8E53 100%)",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${slideUp}px)`,
          textAlign: "center",
          padding: "0 80px",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color: "white",
            fontFamily: "Arial Rounded MT Bold, Arial, sans-serif",
            textShadow: "3px 3px 0px rgba(0,0,0,0.15)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ContentCard: React.FC<{ content: string; backgroundColor: string }> = ({
  content,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor,
      }}
    >
      <div
        style={{
          opacity,
          padding: "60px 100px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 42,
            color: "#333",
            fontFamily: "Arial, sans-serif",
            lineHeight: 1.6,
          }}
        >
          {content}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const StoryVideo: React.FC<Props> = ({
  title,
  content,
  backgroundColor,
}) => {
  const { durationInFrames } = useVideoConfig();
  const midpoint = Math.floor(durationInFrames / 2);

  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={midpoint}>
        <TitleCard title={title} />
      </Sequence>
      <Sequence from={midpoint}>
        <ContentCard content={content} backgroundColor={backgroundColor} />
      </Sequence>
    </AbsoluteFill>
  );
};
