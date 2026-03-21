import React, { useState, useRef, useEffect } from "react";
import Knob from "./common/Knob";
import "../styles/sequencer.css";

const sounds = [
  { name: "Kick", file: "/sounds/kick.wav" },
  { name: "Snare", file: "/sounds/snare.wav" },
  { name: "HiHat", file: "/sounds/hihat.wav" }
];

// 🔌 Receive the Master Controls from Home.jsx
export default function StepSequencer({ isPlaying, bpm, setBpm, masterVolume }) {
  const [stepsCount, setStepsCount] = useState(16);
  const [grid, setGrid] = useState(sounds.map(() => Array(16).fill(false)));
  const [volumes, setVolumes] = useState([1, 1, 1]);
  const [currentStep, setCurrentStep] = useState(0);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState("");
  const [contextMenu, setContextMenu] = useState({visible: false, x: 0, y: 0, rowIndex: null, startStep: 0});
  const [mutedTracks, setMutedTracks] = useState(sounds.map(() => false));

  const gridRef = useRef(grid);
  const volumeRef = useRef(volumes);
  const stepRef = useRef(0);
  const intervalRef = useRef(null);
  const dragMode = useRef(null);
  const isDraggingRef = useRef(false); 
  const audioPlayersRef = useRef({});
  const masterVolumeRef = useRef(masterVolume);
  const mutedTracksRef = useRef(mutedTracks);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { volumeRef.current = volumes; }, [volumes]);
  useEffect(() => { masterVolumeRef.current = masterVolume; }, [masterVolume]);
  useEffect(() => { mutedTracksRef.current = mutedTracks; }, [mutedTracks]);

  useEffect(() => {
    setGrid(prevGrid => {
      return prevGrid.map(row => {
        if (row.length < stepsCount) return [...row, ...Array(stepsCount - row.length).fill(false)];
        if (row.length > stepsCount) return row.slice(0, stepsCount);
        return row;
      });
    });
    stepRef.current = stepRef.current % stepsCount;
    setCurrentStep(stepRef.current);
  }, [stepsCount]);

  const preloadSounds = () => {
    sounds.forEach(sound => {
      if (!audioPlayersRef.current[sound.file]) {
        const audio = new Audio(sound.file);
        audio.preload = "auto";
        audioPlayersRef.current[sound.file] = audio;
      }
    });
  };

  const playStep = () => {
    sounds.forEach((sound, rowIndex) => {
      if (gridRef.current[rowIndex][stepRef.current] && !mutedTracksRef.current[rowIndex]) {
        const audio = audioPlayersRef.current[sound.file];
        if (!audio) return;
        audio.currentTime = 0;
        audio.volume = volumeRef.current[rowIndex] * masterVolumeRef.current;
        audio.play().catch(e => console.log("Audio play blocked by browser:", e));
      }
    });
    setCurrentStep(stepRef.current);
    stepRef.current = (stepRef.current + 1) % stepsCount;
  };

  // 🎧 The Master Engine Loop (Reacts to TopBar)
  useEffect(() => {
    if (!isPlaying) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      stepRef.current = 0;
      setCurrentStep(0);
      return;
    }

    preloadSounds();
    clearInterval(intervalRef.current);
    const stepTime = (60 / bpm) * 1000 / 4;
    intervalRef.current = setInterval(playStep, stepTime);

    return () => clearInterval(intervalRef.current);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, bpm, stepsCount]);

  const updateStep = (row, step, value) => {
    setGrid(prev => {
      const copy = prev.map(r => [...r]);
      copy[row][step] = value;
      return copy;
    });
  };

  const clearBeat = () => {
    setGrid(sounds.map(() => Array(stepsCount).fill(false)));
    stepRef.current = 0;
    setCurrentStep(0);
  };

  useEffect(() => {
    const saved = localStorage.getItem("beatforge-presets");
    if (saved) setPresets(JSON.parse(saved));
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset = { name: presetName, bpm, stepsCount, grid, volumes, mutedTracks, createdAt: Date.now() };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem("beatforge-presets", JSON.stringify(updated));
    setPresetName("");
  };

  const loadPreset = (preset) => {
    if (!preset) return;
    setBpm(preset.bpm);
    setStepsCount(preset.stepsCount);
    setGrid(preset.grid);
    setVolumes(preset.volumes);
    setMutedTracks(preset.mutedTracks || sounds.map(() => false)); // fallback for old saves
  };

  const deletePreset = (index) => {
    const updated = presets.filter((_, i) => i !== index);
    setPresets(updated);
    localStorage.setItem("beatforge-presets", JSON.stringify(updated));
  };

  const fillSteps = (rowIndex, interval, startStep) => {
    setGrid(prev => {
      const updated = [...prev];
      updated[rowIndex] = updated[rowIndex].map((_, i) => i >= startStep && (i - startStep) % interval === 0);
      return updated;
    });
  };

  const clearTrack = (rowIndex) => {
    setGrid(prev => {
      const updated = [...prev];
      updated[rowIndex] = updated[rowIndex].map(() => false);
      return updated;
    });
  };

  // Close context menu if you click anywhere else
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="sequencer" onContextMenu={(e) => e.preventDefault()}>

      {/* 🎛️ COMPACT MASTER CONTROL STRIP */}
      <div className="preset-bar">
        
        {/* LEFT: WORKSPACE TITLE */}
        <div className="sequencer-header">
          <div className="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <h2 className="workspace-title">Step Sequencer</h2>
          <div className="status-dot"></div>
        </div>

        {/* CENTER: PRESET MANAGEMENT */}
        <div className="hardware-panel">
          <div className="panel-label">PRESET LIBRARY</div>
          <div className="panel-controls">
            <input type="text" placeholder="NAME..." value={presetName} onChange={(e) => setPresetName(e.target.value)} className="led-input" />
            
            <button onClick={savePreset} className="panel-btn action-btn" title="Save Preset">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Save
            </button>

            <div className="panel-divider"></div>

            <select className="led-select" onChange={(e) => { const index = e.target.value; if (index !== "") loadPreset(presets[index]); }}>
              <option value="">Load preset...</option>
              {presets.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
            </select>

            <button className="panel-btn danger-icon-btn" title="Delete Preset" onClick={() => { const selectEl = document.querySelector(".led-select"); if (selectEl && selectEl.value !== "") deletePreset(Number(selectEl.value)); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>

        {/* RIGHT: GRID TOOLS */}
        <div className="hardware-panel">
          <div className="panel-label">GRID</div>
          <div className="panel-controls grid-tools-group">
            
            <Knob 
              label="STEPS" 
              value={stepsCount} 
              min={8} max={32} step={1} 
              onChange={setStepsCount} 
            />
            
            <div className="panel-divider"></div>

            {/* The New Hardware Trigger Pad for Clear */}
            <div className="trigger-pad-wrapper">
              <div className="knob-label" style={{ color: '#ff4757' }}>CLEAR</div>
              
              <button onClick={clearBeat} className="trigger-pad" title="Clear Grid">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>

              <div className="pad-spacer"></div>
            </div>

          </div>
        </div>

      </div>

      {/* SEQUENCER GRID */}
      {sounds.map((sound, rowIndex) => (
        <div key={sound.name} className={`sequencer-row ${mutedTracks[rowIndex] ? "muted" : ""}`}>
          
          {/* 1. LEFT CONTROLS (Name, Mute, Options) */}
          <div className="track-label">
            <span className="track-name">{sound.name}</span>
            <div className="track-controls">
              
              <button 
                className={`mute-btn ${mutedTracks[rowIndex] ? "active" : ""}`} 
                onClick={() => {
                  setMutedTracks(prev => { 
                    const copy = [...prev]; 
                    copy[rowIndex] = !copy[rowIndex]; 
                    return copy; 
                  });
                }}
              >M</button>
              
              <button 
                className="track-options-btn" 
                onClick={(e) => {
                  e.preventDefault(); 
                  e.stopPropagation();
                  setContextMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    rowIndex: rowIndex, // Fixed! Now passes rowIndex properly to context menu
                    startStep: 0
                  });
                }}
                title="Track Options"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>
            </div>
          </div>

          {/* 2. CENTER GRID (The Steps) */}
          <div className="steps" onMouseUp={() => (dragMode.current = null)} onMouseLeave={() => (dragMode.current = null)}>
            {grid[rowIndex].map((active, stepIndex) => {
              const isAltGroup = Math.floor(stepIndex / 4) % 2 === 1;
              return (
                <div key={stepIndex} className={`step ${active ? "active" : ""} ${currentStep === stepIndex ? "current" : ""} ${isAltGroup ? "alt-group" : ""}`}
                  onMouseDown={(e) => {
                    isDraggingRef.current = false; 
                    if (e.button === 2) { dragMode.current = "erase"; updateStep(rowIndex, stepIndex, false); } 
                    else { dragMode.current = "paint"; updateStep(rowIndex, stepIndex, true); }
                  }}
                  onMouseEnter={() => {
                    if (!dragMode.current) return;
                    isDraggingRef.current = true; 
                    updateStep(rowIndex, stepIndex, dragMode.current === "paint");
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              );
            })}
          </div>

          {/* 3. RIGHT CONTROLS (Volume Slider) */}
          <div className="track-volume">
            <input type="range" min="0" max="1" step="0.01" value={volumes[rowIndex]} className="volume-slider" onChange={(e) => {
                const copy = [...volumes]; copy[rowIndex] = Number(e.target.value); setVolumes(copy);
              }} />
          </div>

        </div>
      ))}

      {/* CONTEXT MENU COMPONENT */}
      {contextMenu.visible && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="context-item" onClick={() => { fillSteps(contextMenu.rowIndex, 2, contextMenu.startStep); setContextMenu({...contextMenu, visible: false}); }}>Fill every 2 steps</div>
          <div className="context-item" onClick={() => { fillSteps(contextMenu.rowIndex, 4, contextMenu.startStep); setContextMenu({...contextMenu, visible: false}); }}>Fill every 4 steps</div>
          <div className="context-item" onClick={() => { fillSteps(contextMenu.rowIndex, 8, contextMenu.startStep); setContextMenu({...contextMenu, visible: false}); }}>Fill every 8 steps</div>
          <div className="context-divider" />
          <div className="context-item danger" onClick={() => { clearTrack(contextMenu.rowIndex); setContextMenu({...contextMenu, visible: false}); }}>Clear track</div>
        </div>
      )}

    </div>
  );
}