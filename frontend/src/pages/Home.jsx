import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import StepSequencer from "../components/StepSequencer";
import "../styles/home.css";

export default function Home({ currentUser, onLogout }) {
  const [activeView, setActiveView] = useState("Step Sequencer");
  
  // 🎛️ MASTER AUDIO ENGINE STATES
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [masterVolume, setMasterVolume] = useState(0.8);

  const renderWorkspace = () => {
    switch (activeView) {
      case "Step Sequencer":
        return (
          <StepSequencer 
            isPlaying={isPlaying} 
            bpm={bpm} 
            setBpm={setBpm} // Passed so presets can still change the master BPM
            masterVolume={masterVolume} 
          />
        );
      case "Beat Maker":
        return <div style={{ padding: "40px", color: "var(--text-muted)" }}>Beat Maker Workstation (Coming Soon)</div>;
      case "My Samples":
        return <div style={{ padding: "40px", color: "var(--text-muted)" }}>My Samples Library (Coming Soon)</div>;
      case "Settings":
        return <div style={{ padding: "40px", color: "var(--text-muted)" }}>BeatForge Settings</div>;
      default:
        return <StepSequencer isPlaying={isPlaying} bpm={bpm} setBpm={setBpm} masterVolume={masterVolume} />;
    }
  };

  return (
    <div className="home-layout">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      <div className="main-area">
        {/* Pass the Master Controls to the TopBar */}
        <TopBar 
          activeView={activeView} 
          currentUser={currentUser} 
          onLogout={onLogout}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          bpm={bpm}
          setBpm={setBpm}
          masterVolume={masterVolume}
          setMasterVolume={setMasterVolume}
        />

        <div className="workspace">
          {renderWorkspace()}
        </div>
      </div>
    </div>
  );
}