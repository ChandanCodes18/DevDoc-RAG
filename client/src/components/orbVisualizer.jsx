import React from "react";
import { Orb } from "react-ai-orb";

function OrbVisualizer({ isLoading, small }) {
  const currentSpeed = isLoading ? 3 : 1;
  const currentSize = small ? 0.65 : 2.0;

  return (
    <Orb 
      size={currentSize} 
      animationSpeedBase={currentSpeed} 
    />
  );
}

export default OrbVisualizer;