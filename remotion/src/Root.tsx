import React from "react";
import { Composition } from "remotion";
import { THASOutro } from "./THASOutro";
import { Control4Explainer } from "./c4/index";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="THAS-Outro"
        component={THASOutro}
        durationInFrames={122}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Control4Explainer"
        component={Control4Explainer}
        durationInFrames={1260}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
