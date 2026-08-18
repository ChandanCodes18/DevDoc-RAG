import React from "react";
import {Orb} from "react-ai-orb";

function OrbVisualizer({ isLoading }) {
  const currentSpeed = isLoading ? 3 : 1;

  return (
    <div className={`orb-container ${isLoading ? "loading" : ""}`}>
      <Orb animationSpeedBase={currentSpeed} />
    </div>
  );
}

export default OrbVisualizer;