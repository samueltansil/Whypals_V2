import React from "react";
import { Composition } from "remotion";
import { THASOutro } from "./THASOutro";

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
    </>
  );
};
