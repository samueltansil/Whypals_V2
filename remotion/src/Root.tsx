import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { StoryVideo } from "./StoryVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          titleText: "Welcome to WhyPals!",
          titleColor: "#FF6B6B",
        }}
      />
      <Composition
        id="StoryVideo"
        component={StoryVideo}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          title: "Story Title",
          content: "Story content goes here...",
          backgroundColor: "#FFF9F0",
        }}
      />
    </>
  );
};
