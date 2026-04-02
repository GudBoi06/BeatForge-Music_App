import React, { useState, useEffect, useRef } from "react";
import Knob from "./common/Knob"; 
import "../styles/topbar.css";

export default function TopBar({ 
  activeView, currentUser, onLogout,
  isPlaying, setIsPlaying, bpm, setBpm, masterVolume, setMasterVolume,
  stepsCount 
}) {
  
  const [time, setTime] = useState(0);

  // 📦 NEW: Secret boxes to hold the latest values WITHOUT restarting the timer
  const bpmRef = useRef(bpm);
  const stepsCountRef = useRef(stepsCount);

  // Update the secret boxes silently whenever the knobs are turned
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { stepsCountRef.current = stepsCount; }, [stepsCount]);

  // ⏱️ Unstoppable 60FPS Timer Engine
 // ⏱️ Highly Accurate Delta-Time Engine
  useEffect(() => {
    let animationFrameId;
    let lastTimestamp;
    let runningTime = 0; // Tracks our loop time incrementally

    const updateTimer = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      
      // 1. Calculate the exact milliseconds passed since the LAST frame
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      // 2. Read the live knobs from our secret Refs
      const stepTimeMs = (60 / bpmRef.current) * 1000 / 4;
      const loopDurationMs = stepTimeMs * stepsCountRef.current;

      // 3. Add the tiny time chunk to our running total
      runningTime += deltaTime;

      // 4. If we hit the end of the grid, perfectly wrap back to 00:00.00
      if (runningTime >= loopDurationMs) {
        runningTime = runningTime % loopDurationMs;
      }
      
      setTime(runningTime);
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    if (isPlaying) {
      lastTimestamp = performance.now(); // High-precision browser clock
      runningTime = 0; // Start fresh when hitting play
      animationFrameId = requestAnimationFrame(updateTimer);
    } else {
      setTime(0); 
      cancelAnimationFrame(animationFrameId);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // Format milliseconds into classic DAW time format (MM:SS:ms)
  const formatTime = (ms) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor((ms % 1000) / 10); 
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(2, "0")}`;
  };

  return (
    <div className="topbar">
      
      {/* LEFT: View Title & File Actions */}
      <div className="topbar-section left-section">
        <button className="icon-btn save-btn" title="Save Project to Cloud">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          <span>Save</span>
        </button>
      </div>
      
      {/* CENTER: Transport & Master Controls */}
      <div className="topbar-section center-section">
        
        {/* Play/Stop */}
        <div className="transport-group">
          <button className={`transport-btn ${isPlaying ? "playing" : ""}`} onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button className="transport-btn stop-btn" onClick={() => setIsPlaying(false)}>⏹</button>
        </div>

        <div className="transport-divider"></div>

        {/* ⏱️ THE NEW LED TIME DISPLAY */}
        <div 
          className="led-timer" 
          title="Playback Time"
          style={{
            background: '#0a0a0c',
            border: '1px solid #1f1f23',
            padding: '6px 16px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '18px',
            fontWeight: 'bold',
            color: isPlaying ? '#ff4757' : '#555', // Glows red when playing!
            textShadow: isPlaying ? '0 0 10px rgba(255, 71, 87, 0.6)' : 'none',
            letterSpacing: '2px',
            minWidth: '115px',
            textAlign: 'center',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
            transition: 'color 0.2s, text-shadow 0.2s'
          }}
        >
          {formatTime(time)}
        </div>

        <div className="transport-divider"></div>

        {/* Master Knobs */}
        <div className="master-controls">
          <Knob label="BPM" value={bpm} min={40} max={250} onChange={setBpm} />
          <Knob label="MASTER" value={masterVolume * 100} min={0} max={100} onChange={(v) => setMasterVolume(v / 100)} />
        </div>
      </div>

      {/* RIGHT: User Actions & Logout */}
      <div className="topbar-section right-section" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Add this in TopBar.jsx next to your Logout/Profile button */}
          <button 
            onClick={() => alert("Stripe Payment Modal will open here!")}
            style={{
              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
              color: '#000',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '4px',
              fontWeight: '900',
              fontSize: '12px',
              letterSpacing: '1px',
              cursor: 'pointer',
              marginRight: '15px',
              boxShadow: '0 0 10px rgba(255, 165, 0, 0.4)'
            }}
          >
            ⭐ UNLOCK PRO
          </button>
        <div className="user-profile" title="Current Producer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)' }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="user-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span className="username" style={{ fontWeight: '600', fontSize: '14px' }}>
            {currentUser?.username || "Guest"}
          </span>
        </div>

        <button 
          className="icon-btn logout-btn" 
          onClick={onLogout} 
          title="Log Out"
          style={{ 
            background: 'rgba(255, 71, 87, 0.1)', 
            color: '#ff4757', 
            border: '1px solid rgba(255, 71, 87, 0.2)',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          LOGOUT
        </button>

      </div>
    </div>
  );
}