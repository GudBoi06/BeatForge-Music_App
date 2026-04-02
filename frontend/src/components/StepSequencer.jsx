import React, { useState, useRef, useEffect } from "react";
import Knob from "./common/Knob";
import Mixer from "./Mixer"; 
import "../styles/sequencer.css";

const initialDrumKits = [
  {
    name: "MODERN 808",
    sounds: [
      { name: "808 Kick", file: "/sounds/kick.wav" }, 
      { name: "808 Snare", file: "/sounds/snare.wav" },
      { name: "808 Hat", file: "/sounds/hihat.wav" }
    ]
  },
  {
    name: "ACOUSTIC",
    sounds: [
      { name: "Acoustic Kick", file: "/sounds/kick-acoustic.wav" },
      { name: "Acoustic Snare", file: "/sounds/snare-acoustic.wav" },
      { name: "Acoustic Hat", file: "/sounds/hihat-acoustic.wav" }
    ]
  },
  {
    name: "SYNTHWAVE",
    sounds: [
      { name: "Retro Kick", file: "/sounds/kick-retro.wav" },
      { name: "Retro Snare", file: "/sounds/snare-retro.wav" },
      { name: "Retro Hat", file: "/sounds/hihat-retro.wav" }
    ]
  },
  {
    name: "LO-FI CHILL",
    sounds: [
      { name: "Lofi Kick", file: "/sounds/kick-lofi.wav" },
      { name: "Lofi Snare", file: "/sounds/snare-lofi.wav" },
      { name: "Lofi Hat", file: "/sounds/hihat-lofi.wav" }
    ]
  },
  {
    name: "TECHNO HOUSE",
    sounds: [
      { name: "Punch Kick", file: "/sounds/kick-techno.wav" },
      { name: "Clap Snare", file: "/sounds/snare-techno.wav" },
      { name: "Open Hat", file: "/sounds/hihat-techno.wav" }
    ]
  },
  {
    name: "DUBSTEP GRIME",
    sounds: [
      { name: "Heavy Kick", file: "/sounds/kick-dubstep.wav" },
      { name: "Slap Snare", file: "/sounds/snare-dubstep.wav" },
      { name: "Crisp Hat", file: "/sounds/hihat-dubstep.wav" }
    ]
  },
  {
    name: "USER KIT",
    sounds: [
      { name: "Custom Kick", file: "/sounds/kick.wav" }
    ]
  }
];

export default function StepSequencer({ 
  isPlaying, 
  activeStudioView, 
  playbackStartTime, 
  bpm, 
  setBpm, 
  masterVolume, 
  currentUser, 
  setHasActiveBeat, 
  stepsCount, 
  setStepsCount, 
  mySamples, 
  projectPatterns, 
  setProjectPatterns 
}) {
  const [kits, setKits] = useState(initialDrumKits);
  const [currentKitIndex, setCurrentKitIndex] = useState(0);
  
  const currentSounds = kits[currentKitIndex].sounds;

  const [grid, setGrid] = useState(currentSounds.map(() => Array(16).fill(false)));
  const [volumes, setVolumes] = useState(currentSounds.map(() => 1));
  const [mutedTracks, setMutedTracks] = useState(currentSounds.map(() => false));
  const [currentStep, setCurrentStep] = useState(0);
  
  const [showMixer, setShowMixer] = useState(false);
  
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState("");
  const [contextMenu, setContextMenu] = useState({visible: false, x: 0, y: 0, rowIndex: null, startStep: 0});

  const fileInputRef = useRef(null);

  const gridRef = useRef(grid);
  const volumeRef = useRef(volumes);
  const intervalRef = useRef(null);
  const dragMode = useRef(null);
  const isDraggingRef = useRef(false); 
  const audioPlayersRef = useRef({});
  const masterVolumeRef = useRef(masterVolume);
  const mutedTracksRef = useRef(mutedTracks);
  const currentSoundsRef = useRef(currentSounds);
  
  const lastPlayedStepRef = useRef(-1);

  const isCurrentlyPlaying = isPlaying && (activeStudioView === "sequencer" || activeStudioView === "beatmaker");

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { volumeRef.current = volumes; }, [volumes]);
  useEffect(() => { masterVolumeRef.current = masterVolume; }, [masterVolume]);
  useEffect(() => { mutedTracksRef.current = mutedTracks; }, [mutedTracks]);
  useEffect(() => { currentSoundsRef.current = currentSounds; }, [currentSounds]);

  // 🛠️ CRASH FIX: Added `if (!row)` check to prevent "Cannot read properties of undefined (reading 'length')"
  useEffect(() => {
    setGrid(prevGrid => {
      return prevGrid.map(row => {
        if (!row) return Array(stepsCount).fill(false);
        if (row.length < stepsCount) return [...row, ...Array(stepsCount - row.length).fill(false)];
        if (row.length > stepsCount) return row.slice(0, stepsCount);
        return row;
      });
    });
    setCurrentStep(0);
    lastPlayedStepRef.current = -1;
  }, [stepsCount]);

  useEffect(() => {
    const targetLength = kits[currentKitIndex].sounds.length;
    
    setGrid(prev => {
      const newGrid = [...prev];
      while (newGrid.length < targetLength) newGrid.push(Array(stepsCount).fill(false));
      return newGrid; 
    });
    
    setVolumes(prev => {
      const newVols = [...prev];
      while (newVols.length < targetLength) newVols.push(1);
      return newVols; 
    });

    setMutedTracks(prev => {
      const newMutes = [...prev];
      while (newMutes.length < targetLength) newMutes.push(false);
      return newMutes; 
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKitIndex, stepsCount]);

  useEffect(() => {
    setGrid(currentSoundsRef.current.map(() => Array(stepsCount).fill(false)));
    setVolumes(currentSoundsRef.current.map(() => 1));
    setMutedTracks(currentSoundsRef.current.map(() => false));
    setCurrentKitIndex(0);
    
    setCurrentStep(0);
    lastPlayedStepRef.current = -1;
    setShowMixer(false);
    
    if (setHasActiveBeat) setHasActiveBeat(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); 

  const preloadSounds = () => {
    currentSoundsRef.current.forEach(sound => {
      if (!audioPlayersRef.current[sound.file]) {
        const audio = new Audio(sound.file);
        audio.preload = "auto";
        audioPlayersRef.current[sound.file] = audio;
      }
    });
  };

  useEffect(() => {
    if (!isCurrentlyPlaying || !playbackStartTime) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setCurrentStep(0);
      lastPlayedStepRef.current = -1; 
      return;
    }

    preloadSounds();
    clearInterval(intervalRef.current);
    
    const stepDurationMs = (60000 / bpm) / 4; 

    intervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - playbackStartTime;
      const absoluteStep = Math.floor(elapsedMs / stepDurationMs);
      const currentGridStep = absoluteStep % stepsCount;

      if (currentGridStep !== lastPlayedStepRef.current) {
        
        currentSoundsRef.current.forEach((sound, rowIndex) => {
          if (gridRef.current[rowIndex] && gridRef.current[rowIndex][currentGridStep] && !mutedTracksRef.current[rowIndex]) {
            const audio = audioPlayersRef.current[sound.file];
            if (!audio) return;
            audio.currentTime = 0;
            audio.volume = volumeRef.current[rowIndex] * masterVolumeRef.current;
            audio.play().catch(e => console.log("Audio play blocked by browser:", e));
          }
        });
        
        setCurrentStep(currentGridStep);
        lastPlayedStepRef.current = currentGridStep;
      }
    }, 10); 

    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentlyPlaying, playbackStartTime, bpm, stepsCount, currentKitIndex]); 

  const updateStep = (row, step, value) => {
    if (setHasActiveBeat) setHasActiveBeat(true); 
    setGrid(prev => {
      const copy = prev.map(r => [...(r || [])]); // Added safety spread
      if (copy[row]) copy[row][step] = value;
      return copy;
    });
  };

  const clearBeat = () => {
    setGrid(currentSounds.map(() => Array(stepsCount).fill(false)));
    setCurrentStep(0);
    lastPlayedStepRef.current = -1;
    if (setHasActiveBeat) setHasActiveBeat(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, "").substring(0, 10).toUpperCase();

    const newSound = { name: cleanName, file: fileUrl };

    setKits(prev => {
      const copy = [...prev];
      copy[currentKitIndex] = {
        ...copy[currentKitIndex],
        sounds: [...copy[currentKitIndex].sounds, newSound]
      };
      return copy;
    }); 
    setGrid(prev => [...prev, Array(stepsCount).fill(false)]);
    setVolumes(prev => [...prev, 1]);
    setMutedTracks(prev => [...prev, false]);

    e.target.value = null;
  };

  const addTrackFromBrowser = (sample) => {
    if (!sample) return;

    const newSound = { 
      name: sample.name.substring(0, 10).toUpperCase(), 
      file: sample.file 
    };

    setKits(prev => {
      const copy = [...prev];
      copy[currentKitIndex] = {
        ...copy[currentKitIndex],
        sounds: [...copy[currentKitIndex].sounds, newSound]
      };
      return copy;
    });

    setGrid(prev => [...prev, Array(stepsCount).fill(false)]); 
    setVolumes(prev => [...prev, 1]);
    setMutedTracks(prev => [...prev, false]);
  };

  const deleteTrack = (rowIndex) => {
    if (currentSounds.length <= 1) {
      alert("You must have at least one track in the sequencer!");
      return;
    }

    setKits(prev => {
      const copy = [...prev];
      const newSounds = [...copy[currentKitIndex].sounds];
      newSounds.splice(rowIndex, 1);
      copy[currentKitIndex] = { ...copy[currentKitIndex], sounds: newSounds };
      return copy;
    });

    setGrid(prev => prev.filter((_, i) => i !== rowIndex));
    setVolumes(prev => prev.filter((_, i) => i !== rowIndex));
    setMutedTracks(prev => prev.filter((_, i) => i !== rowIndex));
  };

  useEffect(() => {
    if (!currentUser) {
      setPresets([]);
      return;
    }
    
    const fetchCloudPresets = async () => {
      try {
        const token = localStorage.getItem("beatforge_token");
        const res = await fetch("http://localhost:5000/api/presets", {
          headers: { "x-auth-token": token } 
        });
        
        if (res.ok) {
          const data = await res.json();
          setPresets(data);
        }
      } catch (error) {
        console.error("Failed to load cloud presets:", error);
      }
    };

    fetchCloudPresets();
  }, [currentUser]);

  const savePreset = async () => {
    if (!presetName.trim()) {
      alert("Please enter a name for your preset before saving!");
      return;
    }

    if (!currentUser) {
      alert("You must be logged in to save to the cloud!");
      return;
    }

    const presetData = { name: presetName, bpm, stepsCount, grid, volumes, mutedTracks, kitIndex: currentKitIndex };

    try {
      const token = localStorage.getItem("beatforge_token");
      const res = await fetch("http://localhost:5000/api/presets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token 
        },
        body: JSON.stringify(presetData)
      });

      if (res.ok) {
        const savedPreset = await res.json();
        setPresets(prev => [savedPreset, ...prev]);
        setPresetName("");
      }
    } catch (error) {
      console.error("Failed to save preset to cloud:", error);
    }
  };

  const loadPreset = (preset) => {
    if (!preset) return;
    setBpm(preset.bpm);
    setStepsCount(preset.stepsCount);
    setGrid(preset.grid);
    setVolumes(preset.volumes);
    setMutedTracks(preset.mutedTracks || currentSounds.map(() => false));
    if (preset.kitIndex !== undefined) setCurrentKitIndex(preset.kitIndex);
    if (setHasActiveBeat) setHasActiveBeat(true); 
  };

  const deletePreset = async (index) => {
    if (!currentUser) return;
    
    const presetToDelete = presets[index];
    if (!presetToDelete._id) return; 

    try {
      const token = localStorage.getItem("beatforge_token");
      const res = await fetch(`http://localhost:5000/api/presets/${presetToDelete._id}`, {
        method: "DELETE",
        headers: { "x-auth-token": token }
      });

      if (res.ok) {
        setPresets(prev => prev.filter((_, i) => i !== index));
      }
    } catch (error) {
      console.error("Failed to delete preset from cloud:", error);
    }
  };

  const fillSteps = (rowIndex, interval, startStep) => {
    setGrid(prev => {
      const updated = [...prev];
      if (updated[rowIndex]) {
        updated[rowIndex] = updated[rowIndex].map((_, i) => i >= startStep && (i - startStep) % interval === 0);
      }
      return updated;
    });
    if (setHasActiveBeat) setHasActiveBeat(true);
  };

  const clearTrack = (rowIndex) => {
    setGrid(prev => {
      const updated = [...prev];
      if (updated[rowIndex]) {
        updated[rowIndex] = updated[rowIndex].map(() => false);
      }
      return updated;
    });
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // 🎛️ THE FIX: Renamed and wired to Live Pad properly
  const saveToLivePad = () => {
    const hasNotes = gridRef.current.some(row => row && row.some(step => step === true));
    if (!hasNotes) {
      alert("Create a drum beat first before saving!");
      return;
    }
    
    const patternCount = projectPatterns ? projectPatterns.filter(p => p.type === 'drum').length + 1 : 1;
    const defaultName = `Drums ${patternCount}`;
    const patternName = prompt("Name your Drum Pattern:", defaultName);
    
    if (!patternName) return; 

    const newPattern = {
      id: `drum-${Date.now()}`,
      type: 'drum',
      name: patternName,
      data: {
        grid: [...gridRef.current.map(row => [...(row || [])])],
        volumes: [...volumeRef.current],
        kitIndex: currentKitIndex
      }
    };

    if (setProjectPatterns) {
      setProjectPatterns(prev => [...prev, newPattern]);
      alert(`"${patternName}" saved! You can now play it in the Live Pad.`);
    }
  };

  return (
    <div className="sequencer" onContextMenu={(e) => e.preventDefault()}>

      <div className="preset-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        
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
      
        <div className="hardware-panel">
          <div className="panel-label">SOUNDBANK</div>
          <div className="panel-controls">
            
            <button className="panel-btn" onClick={() => setCurrentKitIndex(prev => prev === 0 ? kits.length - 1 : prev - 1)} title="Previous Kit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <div className="led-input" style={{ width: '130px', textAlign: 'center', userSelect: 'none', color: '#00e676', textShadow: '0 0 5px rgba(0, 230, 118, 0.5)' }}>
              {kits[currentKitIndex].name}
            </div>

            <button className="panel-btn" onClick={() => setCurrentKitIndex(prev => (prev + 1) % kits.length)} title="Next Kit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            
          </div>
        </div>

        <div className="hardware-panel">
          <div className="panel-label">PRESET LIBRARY</div>
          <div className="panel-controls">
            <input type="text" placeholder="NAME..." value={presetName} onChange={(e) => setPresetName(e.target.value)} className="led-input" style={{ width: '110px' }} />
            
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>

        <div className="hardware-panel">
          <div className="panel-label">TOOLS</div>
          <div className="panel-controls grid-tools-group">
            
            <Knob 
              label="STEPS" 
              value={stepsCount} 
              min={8} max={32} step={1} 
              onChange={setStepsCount} 
            />
            
            <div className="panel-divider"></div>

            <div className="trigger-pad-wrapper">
              <div className="knob-label" style={{ color: '#ff4757' }}>CLEAR</div>
              <button onClick={clearBeat} className="trigger-pad" title="Clear Grid">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
              <div className="pad-spacer"></div>
            </div>

            <div className="panel-divider"></div>

            <button 
              className="panel-btn action-btn" 
              onClick={() => setShowMixer(!showMixer)} 
              title="Toggle Mixer Console"
              style={{ background: showMixer ? 'var(--accent)' : 'transparent', color: showMixer ? '#fff' : 'var(--text-light)' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M4 22v-7"></path><path d="M4 11V2"></path><path d="M20 22v-5"></path><path d="M20 13V2"></path><path d="M12 22v-11"></path><path d="M12 7V2"></path>
                <line x1="2" y1="11" x2="6" y2="11"></line><line x1="10" y1="7" x2="14" y2="7"></line><line x1="18" y1="13" x2="22" y2="13"></line>
              </svg>
              MIXER
            </button>

            {/* 💾 UPDATED BUTTON */}
            <button onClick={saveToLivePad} className="panel-btn action-btn" style={{ fontWeight: 'bold', background: '#00e676', color: '#000', border: 'none', marginLeft: '10px' }}>
              💾 TO LIVE PAD
            </button>

          </div>
        </div>

      </div>

      {!showMixer ? (
        <div className="grid-view-container">
          {currentSounds.map((sound, rowIndex) => (
            <div key={`${sound.name}-${rowIndex}`} className={`sequencer-row ${mutedTracks[rowIndex] ? "muted" : ""}`}>
              
              <div className="track-label">
                <span className="track-name" title={sound.name}>
                  {sound.name.length > 10 ? sound.name.substring(0, 8) + ".." : sound.name}
                </span>
                <div className="track-controls">
                  
                  <button 
                    className="track-options-btn" 
                    onClick={(e) => {
                      e.preventDefault(); 
                      e.stopPropagation();
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        rowIndex: rowIndex,
                        startStep: 0
                      });
                    }}
                    title="Track Options"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="steps" onMouseUp={() => (dragMode.current = null)} onMouseLeave={() => (dragMode.current = null)}>
                {grid[rowIndex] && grid[rowIndex].map((active, stepIndex) => {
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

              <div className="track-volume" style={{ display: 'none' }}>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <Mixer 
          currentSounds={currentSounds}
          volumes={volumes}
          setVolumes={setVolumes}
          mutedTracks={mutedTracks}
          setMutedTracks={setMutedTracks}
        />
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <input type="file" accept="audio/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
        <button 
          className="panel-btn" 
          onClick={() => fileInputRef.current.click()}
          style={{ flex: 1, padding: '12px', borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', letterSpacing: '2px', color: 'var(--text-muted)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', width: '16px' }}>
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          UPLOAD SAMPLE
        </button>

        <select 
          className="panel-btn"
          style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px dashed rgba(166, 74, 255, 0.4)', color: 'var(--accent)', cursor: 'pointer', outline: 'none', letterSpacing: '2px', textAlign: 'center', appearance: 'none' }}
          onChange={(e) => {
            const selectedId = e.target.value; 
            const sample = mySamples.find(s => String(s.id) === String(selectedId)); 
            if (sample) addTrackFromBrowser(sample);
            e.target.value = ""; 
          }}
        >
          <option value="" style={{ background: '#0f0f13', color: '#fff' }}>+ FROM BROWSER...</option>
          {mySamples.map(s => (
            <option key={s.id} value={s.id} style={{ background: '#0f0f13', color: '#fff' }}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {contextMenu.visible && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="context-item" onClick={() => { fillSteps(contextMenu.rowIndex, 2, contextMenu.startStep); setContextMenu({...contextMenu, visible: false}); }}>Fill every 2 steps</div>
          <div className="context-item" onClick={() => { fillSteps(contextMenu.rowIndex, 4, contextMenu.startStep); setContextMenu({...contextMenu, visible: false}); }}>Fill every 4 steps</div>
          <div className="context-item" onClick={() => { fillSteps(contextMenu.rowIndex, 8, contextMenu.startStep); setContextMenu({...contextMenu, visible: false}); }}>Fill every 8 steps</div>
          <div className="context-divider" />
          <div className="context-item" onClick={() => { clearTrack(contextMenu.rowIndex); setContextMenu({...contextMenu, visible: false}); }}>Clear track</div>
          <div className="context-divider" />
          <div className="context-item danger" onClick={() => { deleteTrack(contextMenu.rowIndex); setContextMenu({...contextMenu, visible: false}); }}>
            Delete track
          </div>
        </div>
      )}

    </div>
  );
}