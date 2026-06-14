import React from "react";
import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { StoryVideo } from "./StoryVideo";
import { HomeAutomationOutro } from "./HomeAutomationOutro";
import { HomeAutomationPuzzle } from "./HomeAutomationPuzzle";

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
      <Composition
        id="HomeAutomationPuzzle"
        component={HomeAutomationPuzzle}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HomeAutomationOutro"
        component={HomeAutomationOutro}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
