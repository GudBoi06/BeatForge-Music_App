import React from "react";
import Knob from "./common/Knob"; // Import our new hardware knob
import "../styles/topbar.css";

export default function TopBar({ 
  activeView, currentUser, onLogout,
  isPlaying, setIsPlaying, bpm, setBpm, masterVolume, setMasterVolume 
}) {
  return (
    <div className="topbar">
      
      {/* LEFT: View Title & File Actions */}
      <div className="topbar-section left-section">
        {/* LEFT: Global File Actions */}
      <div className="topbar-section left-section">
        <button className="icon-btn save-btn" title="Save Project to Cloud">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          <span>Save</span>
        </button>
      </div>
      </div>
      
      {/* CENTER: Transport & Master Controls (Leave this exactly as it is!) */}
      <div className="topbar-section center-section">
  {/* Left: Play/Stop */}
  <div className="transport-group">
    <button className={`transport-btn ${isPlaying ? "playing" : ""}`} onClick={() => setIsPlaying(!isPlaying)}>
      {isPlaying ? "⏸" : "▶"}
    </button>
    <button className="transport-btn stop-btn" onClick={() => setIsPlaying(false)}>⏹</button>
  </div>

  <div className="transport-divider"></div>

  {/* Right: Master Knobs */}
  <div className="master-controls">
    <Knob label="BPM" value={bpm} min={40} max={250} onChange={setBpm} />
    <Knob label="MASTER" value={masterVolume * 100} min={0} max={100} onChange={(v) => setMasterVolume(v / 100)} />
  </div>
</div>

      {/* RIGHT: User Actions (Now purely for account/session) */}
      <div className="topbar-section right-section">
        
        {/* Enlarged User Profile Badge */}
        <div className="user-profile" title="Current Producer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="user-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span className="username">{currentUser?.username || "Guest"}</span>
        </div>

        {/* Minimalist Power/Logout Button */}
        <button className="icon-btn logout-btn" onClick={onLogout} title="Log Out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}