import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import "./App.css";
import { motion } from "framer-motion";
import OrbVisualizer from "./components/orbVisualizer";

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  return (
    <div className="app-wrapper">
      <div className="header-pill"> AI Assistant </div>
      <motion.div className={`orb-container ${messages.length === 0 ? "orb-welcome-layout" : "orb-chat-layout"}`}>
        <OrbVisualizer isLoading={isLoading} />
      </motion.div>
    </div>
  );
}

export default App;
