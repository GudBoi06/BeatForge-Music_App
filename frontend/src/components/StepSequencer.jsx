import React, { useState, useRef, useEffect } from "react";
import Knob from "./common/Knob";
import "../styles/sequencer.css";

const sounds = [
  { name: "Kick", file: "/sounds/kick.wav" },
  { name: "Snare", file: "/sounds/snare.wav" },
  { name: "HiHat", file: "/sounds/hihat.wav" }
];

export default function StepSequencer() {
  /* ===========================
     STATE (UI ONLY)
  ============================ */
  const [stepsCount, setStepsCount] = useState(16);
  const [grid, setGrid] = useState(sounds.map(() => Array(16).fill(false)));
  const [volumes, setVolumes] = useState([1, 1, 1]);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState("");
  const [contextMenu, setContextMenu] = useState({visible: false,x: 0,y: 0,rowIndex: null,startStep: 0});

  /* ===========================
     REFS (AUDIO ENGINE)
  ============================ */
  const gridRef = useRef(grid);
  const volumeRef = useRef(volumes);
  const stepRef = useRef(0);
  const intervalRef = useRef(null);
  const dragMode = useRef(null); // "paint" | "erase"
  const isDraggingRef = useRef(false); 
  const audioPlayersRef = useRef({});
  const [masterVolume, setMasterVolume] = useState(0.8);
  const masterVolumeRef = useRef(masterVolume);
  const [mutedTracks, setMutedTracks] = useState(sounds.map(() => false));
  const mutedTracksRef = useRef(mutedTracks);

  /* ===========================
     KEEP REFS IN SYNC
  ============================ */
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    volumeRef.current = volumes;
  }, [volumes]);

  useEffect(() => {
    masterVolumeRef.current = masterVolume;
  }, [masterVolume]);
  
  useEffect(() => {
    mutedTracksRef.current = mutedTracks;
  }, [mutedTracks]);


  /* ===========================
     REBUILD GRID ON STEP CHANGE
  ============================ */
  useEffect(() => {
  setGrid(prevGrid => {
    return prevGrid.map(row => {
      // If steps increased → add empty steps
      if (row.length < stepsCount) {
        return [
          ...row,
          ...Array(stepsCount - row.length).fill(false)
        ];
      }

      // If steps decreased → trim extra steps
      if (row.length > stepsCount) {
        return row.slice(0, stepsCount);
      }

      return row;
    });
  });

  // Keep playback position valid
  stepRef.current =
    stepRef.current % stepsCount;
  setCurrentStep(stepRef.current);
}, [stepsCount]);


  /* ===========================
     AUDIO PLAYBACK (CORE)
  ============================ */
  const playStep = () => {
  sounds.forEach((sound, rowIndex) => {
    if (
      gridRef.current[rowIndex][stepRef.current] &&
      !mutedTracksRef.current[rowIndex] 
    ) {
      const audio = audioPlayersRef.current[sound.file];
      if (!audio) return;

      audio.currentTime = 0;
      audio.volume =
        volumeRef.current[rowIndex] * masterVolumeRef.current;
      audio.play();
    }
  });

  setCurrentStep(stepRef.current);
  stepRef.current = (stepRef.current + 1) % stepsCount;
};



  /* ===========================
     TRANSPORT CONTROLS
  ============================ */
  const start = () => {
    if (isPlaying) return;
    setIsPlaying(true);
  };

  const stop = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsPlaying(false);
    stepRef.current = 0;
    setCurrentStep(0);
  };

  const clearBeat = () => {
    setGrid(sounds.map(() => Array(stepsCount).fill(false)));
    stepRef.current = 0;
    setCurrentStep(0);
  };

  /* ===========================
     REAL-TIME BPM ENGINE
  ============================ */
  useEffect(() => {
    if (!isPlaying) return;

    clearInterval(intervalRef.current);

    const stepTime = (60 / bpm) * 1000 / 4;

    intervalRef.current = setInterval(playStep, stepTime);

    return () => clearInterval(intervalRef.current);
  }, [bpm, isPlaying, stepsCount]);

  /* ===========================
     STEP UPDATE (PAINT / ERASE)
  ============================ */
  const updateStep = (row, step, value) => {
    setGrid(prev => {
      const copy = prev.map(r => [...r]);
      copy[row][step] = value;
      return copy;
    });
  };

  const handleBpmWheel = (e) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 1 : -1;
  setBpm((prev) =>
    Math.min(200, Math.max(60, prev + delta))
  );
};

const handleStepsWheel = (e) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 1 : -1;
  setStepsCount((prev) =>
    Math.min(32, Math.max(4, prev + delta))
  );
};

const preloadSounds = () => {
  sounds.forEach(sound => {
    if (!audioPlayersRef.current[sound.file]) {
      const audio = new Audio(sound.file);
      audio.preload = "auto";
      audioPlayersRef.current[sound.file] = audio;
    }
  });
};

/* ===========================
     SAVE / STATE PRESETS
  ============================ */

  useEffect(() => {
  const saved = localStorage.getItem("beatforge-presets");
  if (saved) {
    setPresets(JSON.parse(saved));
  }
}, []);

const savePreset = () => {
  if (!presetName.trim()) return;

  const existingIndex = presets.findIndex(
    p => p.name.toLowerCase() === presetName.toLowerCase()
  );

  if (existingIndex !== -1) {
    const confirmOverwrite = window.confirm(
      "Preset already exists. Overwrite it?"
    );

    if (!confirmOverwrite) return;

    const updated = [...presets];
    updated[existingIndex] = {
      ...updated[existingIndex],
      bpm,
      stepsCount,
      grid,
      volumes,
      mutedTracks,
      createdAt: Date.now()
    };

    setPresets(updated);
    localStorage.setItem(
      "beatforge-presets",
      JSON.stringify(updated)
    );

    setPresetName("");
    return;
  }

  const newPreset = {
    name: presetName,
    bpm,
    stepsCount,
    grid,
    volumes,
    mutedTracks,
    createdAt: Date.now()
  };

  const updated = [...presets, newPreset];
  setPresets(updated);
  localStorage.setItem(
    "beatforge-presets",
    JSON.stringify(updated)
  );

  setPresetName("");
};

const loadPreset = (preset) => {
  if (!preset) return;

  setBpm(preset.bpm);
  setStepsCount(preset.stepsCount);
  setGrid(preset.grid);
  setVolumes(preset.volumes);
  setMutedTracks(preset.mutedTracks);
};


const deletePreset = (index) => {
  const confirmDelete = window.confirm(
    "Delete this preset?"
  );
  if (!confirmDelete) return;

  const updated = presets.filter(
    (_, i) => i !== index
  );
  setPresets(updated);
  localStorage.setItem(
    "beatforge-presets",
    JSON.stringify(updated)
  );
};

/* ===========================
      FILL STEPS FUNCTION
  ============================ */

  useEffect(() => {
  const closeMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  if (contextMenu.visible) {
    window.addEventListener("click", closeMenu);
  }

  return () => {
    window.removeEventListener("click", closeMenu);
  };
}, [contextMenu.visible]);

const fillSteps = (rowIndex, interval, startStep) => {
  setGrid(prev => {
    const updated = [...prev];
    updated[rowIndex] = updated[rowIndex].map((_, i) =>
      i >= startStep && (i - startStep) % interval === 0
    );
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



  /* ===========================
     RENDER
  ============================ */
  return (
    <div
      className="sequencer"
      onContextMenu={(e) => e.preventDefault()}
    >

      <div className="preset-bar">
        <input
          type="text"
          placeholder="Preset name"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          className="preset-input"
        />

        <button onClick={savePreset} className="preset-btn">
          Save
        </button>

        <select
          className="preset-select"
          onChange={(e) => {
            const index = e.target.value;
            if (index === "") return;
            loadPreset(presets[index]);
          }}
        >
          <option value="">Load preset</option>
          {presets.map((p, i) => (
            <option key={i} value={i}>
              {p.name} •{" "}
              {new Date(p.createdAt).toLocaleDateString()}
            </option>
          ))}
        </select>

        <button
          className="preset-btn"
          onClick={() => {
            const index =
              document.querySelector(".preset-select")
                .value;
            if (index !== "") {
              deletePreset(Number(index));
            }
          }}
        >
         Delete
        </button>

      </div>


      {/* TRANSPORT BAR */}
      <div className="transport-bar">
        <div className="transport-left">
          <button
            onClick={() => {
                preloadSounds();
                start();
            }}
            >▶
          </button>
          <button onClick={stop}>⏹</button>
          <button onClick={clearBeat}>X</button>
        </div>

        <div className="transport-right">
          <div className="bpm-control">
            <Knob
            label="BPM"
            value={bpm}
            min={60}
            max={300}
            step={1}
            onChange={setBpm}
            />
          </div>
          <div className="bpm-control">
            <Knob
              label="STEPS"
              value={stepsCount}
              min={8}
              max={32}
              step={1}
              onChange={(v) => {
                const safeValue = Math.min(32, Math.max(8, v));
                setStepsCount(safeValue);
              }}
            />
          </div>
          <div className="bpm-control">
            <Knob
            label="MASTER"
            value={Math.round(masterVolume * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(v) => setMasterVolume(v / 100)}
            />
          </div>
        </div>
      </div>

      {/* SEQUENCER GRID */}
{sounds.map((sound, rowIndex) => (
  <div
    key={sound.name}
    className={`sequencer-row ${
      mutedTracks[rowIndex] ? "muted" : ""
    }`}
  >
    {/* COLUMN 1 — TRACK LABEL + MUTE */}
    <div className="track-label">
      <span className="track-name">{sound.name}</span>

      <div className="track-controls">
        <button
          className={`mute-btn ${
            mutedTracks[rowIndex] ? "active" : ""
          }`}
          onClick={() => {
            setMutedTracks(prev => {
              const copy = [...prev];
              copy[rowIndex] = !copy[rowIndex];
              return copy;
            });
          }}
        >
          M
        </button>
      </div>
    </div>
    

    {/* COLUMN 2 — VOLUME */}
    <div className="track-volume">
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volumes[rowIndex]}
        className="volume-slider"
        onChange={(e) => {
          const copy = [...volumes];
          copy[rowIndex] = Number(e.target.value);
          setVolumes(copy);
        }}
      />
    </div>

    {/* COLUMN 3 — STEPS */}
    <div
      className="steps"
      onMouseUp={() => (dragMode.current = null)}
      onMouseLeave={() => (dragMode.current = null)}
    >
      {grid[rowIndex].map((active, stepIndex) => {
        const isAltGroup =
          Math.floor(stepIndex / 4) % 2 === 1;

        return (
          <div
            className={`step
              ${active ? "active" : ""}
              ${currentStep === stepIndex ? "current" : ""}
              ${isAltGroup ? "alt-group" : ""}
            `}
            onMouseDown={(e) => {
              // 1. Reset the dragging flag every time we click down
              isDraggingRef.current = false; 
              
              if (e.button === 2) {
                dragMode.current = "erase";
                updateStep(rowIndex, stepIndex, false);
              } else {
                dragMode.current = "paint";
                updateStep(rowIndex, stepIndex, true);
              }
            }}
            onMouseEnter={() => {
              if (!dragMode.current) return;
              
              // 2. If we enter a new step while dragMode is active, we are officially dragging
              isDraggingRef.current = true; 
              
              updateStep(
                rowIndex,
                stepIndex,
                dragMode.current === "paint"
              );
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              
              // 3. Block the menu from opening if we were just dragging to erase
              if (isDraggingRef.current) return; 
              
              setContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                rowIndex,
                startStep: stepIndex
              });
            }}
          />

            );
            })}
        </div>
    </div>
    ))}
    {contextMenu.visible && (
      <div
        className="context-menu"
        style={{
          top: contextMenu.y,
          left: contextMenu.x
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="context-item"
          onClick={() =>
            fillSteps(
              contextMenu.rowIndex,
              2,
              contextMenu.startStep
            )
          }
        >
          Fill every 2 steps
        </div>

        <div
          className="context-item"
          onClick={() =>
            fillSteps(
              contextMenu.rowIndex,
              4,
              contextMenu.startStep
            )
          }
        >
          Fill every 4 steps
        </div>

        <div
          className="context-item"
          onClick={() =>
            fillSteps(
              contextMenu.rowIndex,
              8,
              contextMenu.startStep
            )
          }
        >
          Fill every 8 steps
        </div>

        <div className="context-divider" />

        <div
          className="context-item danger"
          onClick={() => clearTrack(contextMenu.rowIndex)}
        >
          Clear track
        </div>
      </div>
    )}

    </div>
    
  );
}
