import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import StepSequencer from "../components/StepSequencer";
import MelodyMatrix from "../components/MelodyMatrix";
import LivePad from "../components/LivePad";
import "../styles/home.css";

export default function Home({ currentUser, onLogout, setCurrentView }) {
  const [activeStudioView,  setActiveStudioView]  = useState("sequencer");
  const [isPlaying,         setIsPlaying]         = useState(false);
  const [playbackStartTime, setPlaybackStartTime] = useState(0);
  const [bpm,               setBpm]               = useState(120);
  const [masterVolume,      setMasterVolume]      = useState(0.8);
  const [stepsCount,        setStepsCount]        = useState(16);
  const [hasActiveBeat,     setHasActiveBeat]     = useState(false);
  const [mySamples,         setMySamples]         = useState([]);
  const [projectPatterns,   setProjectPatterns]   = useState([]);

  // Update playback start time whenever play is toggled
  useEffect(() => { setPlaybackStartTime(isPlaying ? Date.now() : 0); }, [isPlaying]);

  // Shared props passed to every workspace tool
  const shared = { isPlaying, activeStudioView, playbackStartTime, bpm, setBpm, stepsCount, setStepsCount, setHasActiveBeat, projectPatterns, setProjectPatterns, currentUser };

  const workspace = {
    sequencer: <StepSequencer {...shared} masterVolume={masterVolume} mySamples={mySamples} />,
    beatmaker: <MelodyMatrix  {...shared} />,
    livepad:   <LivePad       {...shared} masterVolume={masterVolume} />,
  };

  return (
    <div className="home-layout">
      <Sidebar setCurrentView={setCurrentView} activeStudioView={activeStudioView} setActiveStudioView={setActiveStudioView} mySamples={mySamples} setMySamples={setMySamples} currentUser={currentUser} />
      <div className="main-area">
        <TopBar setCurrentView={setCurrentView} activeView={activeStudioView} currentUser={currentUser} onLogout={onLogout} isPlaying={isPlaying} setIsPlaying={setIsPlaying} bpm={bpm} setBpm={setBpm} masterVolume={masterVolume} setMasterVolume={setMasterVolume} stepsCount={stepsCount} />
        <div className="workspace">
          {workspace[activeStudioView] ?? null}
        </div>
      </div>
    </div>
  );
}