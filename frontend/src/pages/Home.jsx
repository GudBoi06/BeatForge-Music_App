import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import StepSequencer from "../components/StepSequencer";
import "../styles/home.css";

export default function Home() {
  // State to track which tool is currently open
  const [activeView, setActiveView] = useState("Step Sequencer");

  // A switch function to change the workspace content
  const renderWorkspace = () => {
    switch (activeView) {
      case "Step Sequencer":
        return <StepSequencer />;
      case "Beat Maker":
        return <div style={{ padding: "40px", color: "var(--text-muted)" }}>Beat Maker Workstation (Coming Soon)</div>;
      case "My Samples":
        return <div style={{ padding: "40px", color: "var(--text-muted)" }}>My Samples Library (Coming Soon)</div>;
      case "Settings":
        return <div style={{ padding: "40px", color: "var(--text-muted)" }}>BeatForge Settings</div>;
      default:
        return <StepSequencer />;
    }
  };

  return (
    <div className="home-layout">
      {/* Pass the state to the Sidebar so it knows what to highlight */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      <div className="main-area">
        {/* Pass the state to TopBar so it can update the title */}
        <TopBar activeView={activeView} />

        <div className="workspace">
          {renderWorkspace()}
        </div>
      </div>
    </div>
  );
}