import React, { useState, useEffect, useRef, useMemo } from "react";
import "../styles/pianoroll.css"; 

const ALL_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALES = {
  "Major": [0, 2, 4, 5, 7, 9, 11],
  "Minor": [0, 2, 3, 5, 7, 8, 10],
  "Pentatonic Minor": [0, 3, 5, 7, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11]
};

export default function MelodyMatrix({ isPlaying, activeStudioView, bpm, stepsCount = 16, setHasActiveBeat, projectPatterns, setProjectPatterns }) {
  const [rootNote, setRootNote] = useState(0); 
  const [scaleType, setScaleType] = useState("Minor");
  
  const [gridSnap, setGridSnap] = useState(1); 
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSnapMenuOpen, setIsSnapMenuOpen] = useState(false);
  
  const [drawTool, setDrawTool] = useState("pencil"); 
  
  const [notes, setNotes] = useState([]);
  const [currentTick, setCurrentTick] = useState(0); 
  
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const dragMode = useRef(null);
  const dropdownRef = useRef(null);

  // ⏱️ Absolute time trackers to prevent skipped notes
  const startTimeRef = useRef(0);
  const lastPlayedTickRef = useRef(-1);

  const totalBeats = stepsCount / 4;

  // 🎧 OVERLAPPING PLAYBACK
  const isCurrentlyPlaying = isPlaying && (activeStudioView === "beatmaker" || activeStudioView === "sequencer");

  const allGridNotes = useMemo(() => {
    const arr = [];
    for (let octaveOffset = 2; octaveOffset >= -1; octaveOffset--) {
      for (let noteIndex = 11; noteIndex >= 0; noteIndex--) {
        const absoluteIndex = noteIndex + (octaveOffset * 12);
        const intervalFromRoot = (noteIndex - rootNote + 12) % 12;
        const inScale = SCALES[scaleType].includes(intervalFromRoot);
        const isRoot = intervalFromRoot === 0;

        arr.push({
          name: `${ALL_NOTES[noteIndex]}${4 + octaveOffset}`,
          freq: 261.63 * Math.pow(2, absoluteIndex / 12),
          isBlack: [1, 3, 6, 8, 10].includes(noteIndex), 
          inScale: inScale,
          isRoot: isRoot
        });
      }
    }
    return arr;
  }, [rootNote, scaleType]);

  const notesRef = useRef(notes);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  const scaleNotesRef = useRef(allGridNotes);
  useEffect(() => { scaleNotesRef.current = allGridNotes; }, [allGridNotes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSnapMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current && AudioContext) audioCtxRef.current = new AudioContext();
  }, []);

  const playSynthNote = (freq, durationInSeconds) => {
    if (!audioCtxRef.current) return;
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();

    const osc = audioCtxRef.current.createOscillator();
    const gainNode = audioCtxRef.current.createGain();
    const filter = audioCtxRef.current.createBiquadFilter();

    osc.type = "sawtooth"; 
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, audioCtxRef.current.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, audioCtxRef.current.currentTime + (durationInSeconds * 0.9));

    osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);

    gainNode.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtxRef.current.currentTime + 0.02); 
    gainNode.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime + Math.max(0, durationInSeconds - 0.05)); 
    gainNode.gain.linearRampToValueAtTime(0.001, audioCtxRef.current.currentTime + durationInSeconds); 

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);

    osc.start();
    osc.stop(audioCtxRef.current.currentTime + durationInSeconds + 0.1);
  };

  // 🧠 BULLETPROOF ABSOLUTE TIME ENGINE
  useEffect(() => {
    if (!isCurrentlyPlaying) {
      clearInterval(intervalRef.current);
      setCurrentTick(0);
      lastPlayedTickRef.current = -1;
      return;
    }
    
    clearInterval(intervalRef.current);
    startTimeRef.current = Date.now();
    
    const TICKS_PER_BEAT = 48; 
    const tickDurationMs = (60000 / bpm) / TICKS_PER_BEAT; 
    const TOTAL_TICKS = totalBeats * TICKS_PER_BEAT; 

    intervalRef.current = setInterval(() => {
      // Calculate exactly where we are in real-world time
      const elapsedMs = Date.now() - startTimeRef.current;
      const absoluteTick = Math.floor(elapsedMs / tickDurationMs);
      const currentLoopTick = absoluteTick % TOTAL_TICKS;

      // If we crossed a tick boundary, calculate all ticks we need to process
      // This catches any notes that might have been skipped if the browser lagged
      if (currentLoopTick !== lastPlayedTickRef.current) {
        let ticksToProcess = [];
        
        if (lastPlayedTickRef.current === -1) {
          ticksToProcess.push(currentLoopTick);
        } else if (currentLoopTick > lastPlayedTickRef.current) {
          for (let t = lastPlayedTickRef.current + 1; t <= currentLoopTick; t++) {
            ticksToProcess.push(t);
          }
        } else {
          // Handle the loop wrapping around back to the beginning
          for (let t = lastPlayedTickRef.current + 1; t < TOTAL_TICKS; t++) {
            ticksToProcess.push(t);
          }
          for (let t = 0; t <= currentLoopTick; t++) {
            ticksToProcess.push(t);
          }
        }

        // Check if any notes land on the exact ticks we just crossed
        notesRef.current.forEach(note => {
          const noteStartTick = Math.round(note.startBeat * TICKS_PER_BEAT);
          if (ticksToProcess.includes(noteStartTick)) {
            const durationInSecs = (60 / bpm) * note.durationBeats;
            playSynthNote(scaleNotesRef.current[note.row].freq, durationInSecs);
          }
        });

        setCurrentTick(currentLoopTick);
        lastPlayedTickRef.current = currentLoopTick;
      }
    }, 5); // Fast polling to keep the UI perfectly aligned
    
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentlyPlaying, bpm, totalBeats]); 

  const handleGridClick = (row, startBeat) => {
    if (setHasActiveBeat) setHasActiveBeat(true);
    
    const newEndBeat = startBeat + gridSnap;
    const filteredNotes = notes.filter(n => {
      if (n.row !== row) return true;
      const nEnd = n.startBeat + n.durationBeats;
      return !(startBeat < nEnd && newEndBeat > n.startBeat);
    });

    const newNote = {
      id: Date.now() + Math.random(),
      row: row,
      startBeat: startBeat,
      durationBeats: gridSnap
    };

    setNotes([...filteredNotes, newNote]);
    playSynthNote(allGridNotes[row].freq, (60 / bpm) * gridSnap);
  };

  const deleteNote = (noteId) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (notes.length <= 1 && setHasActiveBeat) setHasActiveBeat(false);
  };

  const autoGenerateMelody = () => {
    const generated = [];
    
    const validRows = [];
    allGridNotes.forEach((note, index) => {
      if (note.inScale) validRows.push(index);
    });

    for (let beat = 0; beat < totalBeats; beat += gridSnap) {
      if (Math.random() > 0.4) {
        generated.push({
          id: Date.now() + Math.random(),
          row: validRows[Math.floor(Math.random() * validRows.length)],
          startBeat: beat,
          durationBeats: gridSnap * (Math.random() > 0.5 ? 1 : 2) 
        });
      }
    }
    setNotes(generated);
    if (setHasActiveBeat) setHasActiveBeat(true);
  };

  // 🛠️ THE FIX: Renamed from saveToArranger to saveToLivePad
  const saveToLivePad = () => {
    if (notes.length === 0) {
      alert("Draw some notes on the grid before saving to the Live Pad!");
      return;
    }
    
    const defaultName = `Melody ${projectPatterns?.filter(p => p.type === 'melody').length + 1 || 1}`;
    const patternName = prompt("Name your Melody Pattern:", defaultName);
    
    if (!patternName) return; 

    const newPattern = {
      id: `melody-${Date.now()}`,
      type: 'melody',
      name: patternName,
      data: [...notes], 
      scale: scaleType,
      root: rootNote
    };

    if (setProjectPatterns) {
      setProjectPatterns(prev => [...prev, newPattern]);
      alert(`"${patternName}" saved! You can now play it in the Live Pad.`);
    }
  };

  const gridColumns = Math.round(totalBeats / gridSnap); 

  const snapOptions = [
    { label: "Bar", value: 4 },
    { label: "Beat", value: 1 },
    { label: "1/2 Beat", value: 0.5 },
    { label: "1/3 Beat", value: 1/3 },
    { label: "Step (1/4 Beat)", value: 0.25 },
    { label: "1/2 Step", value: 0.125 },
    { label: "1/3 Step", value: 0.25 / 3 },
    { label: "1/4 Step", value: 0.0625 }
  ];

  return (
    <div 
      className="piano-roll-workspace" 
      onContextMenu={(e) => e.preventDefault()}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      
      <style>{`
        .custom-zoom-slider { -webkit-appearance: none; width: 80px; background: transparent; }
        .custom-zoom-slider::-webkit-slider-runnable-track { height: 6px; background: #0a0a0c; border-radius: 3px; border: 1px solid #222; }
        .custom-zoom-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; background: var(--accent, #a64aff); margin-top: -5px; cursor: ew-resize; box-shadow: 0 0 10px rgba(166, 74, 255, 0.6); transition: all 0.2s ease; }
        .custom-zoom-slider::-webkit-slider-thumb:hover { transform: scale(1.3); background: #fff; }

        .magnet-dropdown { position: relative; user-select: none; }
        .magnet-btn { display: flex; align-items: center; gap: 8px; background: #000; border: 1px solid #a64aff; border-radius: 6px; padding: 6px 12px; color: #00e676; font-weight: bold; font-size: 13px; cursor: pointer; box-shadow: 0 0 8px rgba(166, 74, 255, 0.3); transition: border-color 0.2s; }
        .magnet-btn:hover { border-color: #c88cff; }
        .magnet-menu { position: absolute; top: 100%; left: 0; margin-top: 6px; background: #000; border: 1px solid #333; border-radius: 6px; width: 140px; z-index: 100; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.8); }
        .magnet-option { padding: 8px 12px; color: #00e676; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: bold; transition: background 0.1s; border-bottom: 1px solid #111; }
        .magnet-option:hover { background: #1976D2; color: #fff; }

        .tool-btn { padding: 6px 10px; border: none; cursor: pointer; font-size: 14px; transition: 0.1s; }
        .tool-btn.active { background: var(--accent); color: #fff; }
        .tool-btn.inactive { background: transparent; color: #555; }
        .tool-btn.inactive:hover { background: rgba(255,255,255,0.1); color: #fff; }

        .roll-container::-webkit-scrollbar { height: 14px; width: 14px; background: #0f0f13; }
        .roll-container::-webkit-scrollbar-track { background: #111; border-top: 1px solid #222; border-left: 1px solid #222; }
        .roll-container::-webkit-scrollbar-thumb { background: #555; border-radius: 8px; border: 3px solid #111; }
        .roll-container::-webkit-scrollbar-thumb:hover { background: #777; }
      `}</style>

      <div className="roll-header-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', flexShrink: 0 }}>
        <div className="sequencer-header">
          <div className="header-icon">🧬</div>
          <h2 className="workspace-title">Melody Matrix</h2>
        </div>
        
        <div className="hardware-panel" style={{ flexDirection: 'row', padding: '6px 12px' }}>
          
          <select className="led-select" value={rootNote} onChange={(e) => setRootNote(Number(e.target.value))} style={{ width: '60px' }}>
            {ALL_NOTES.map((note, index) => <option key={index} value={index}>{note}</option>)}
          </select>

          <select className="led-select" value={scaleType} onChange={(e) => setScaleType(e.target.value)}>
            {Object.keys(SCALES).map(scale => <option key={scale} value={scale}>{scale}</option>)}
          </select>

          <div className="panel-divider"></div>

          <div className="magnet-dropdown" ref={dropdownRef}>
            <div className="magnet-btn" onClick={() => setIsSnapMenuOpen(!isSnapMenuOpen)}>
              🧲 {snapOptions.find(o => Math.abs(o.value - gridSnap) < 0.001)?.label || "Snap"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px', marginLeft: 'auto' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            
            {isSnapMenuOpen && (
              <div className="magnet-menu" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {snapOptions.map((opt, idx) => (
                  <div key={idx} className="magnet-option" onClick={() => { setGridSnap(opt.value); setIsSnapMenuOpen(false); }}>
                    🧲 {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-divider"></div>

          <div style={{ display: 'flex', background: '#000', borderRadius: '4px', border: '1px solid #333', overflow: 'hidden' }}>
            <button 
              className={`tool-btn ${drawTool === 'pencil' ? 'active' : 'inactive'}`}
              onClick={() => setDrawTool('pencil')}
              title="Pencil (Draw one note per click)"
            >
              ✏️
            </button>
            <button 
              className={`tool-btn ${drawTool === 'brush' ? 'active' : 'inactive'}`}
              onClick={() => setDrawTool('brush')}
              title="Paintbrush (Click and drag to paint notes)"
            >
              🖌️
            </button>
          </div>

          <div className="panel-divider"></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#141419', padding: '0 10px', borderRadius: '4px', border: '1px solid #222' }}>
            <span title="Zoom Grid" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔍</span>
            <input type="range" min="1" max="4" step="0.1" value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))} className="custom-zoom-slider" />
          </div>

        </div>

        <div style={{ flex: 1 }}></div>

        {/* 🛠️ THE FIX: Updated button onClick handler and text */}
        <button onClick={saveToLivePad} className="panel-btn action-btn" style={{ fontWeight: 'bold', background: 'var(--accent)', color: '#fff', border: 'none' }}>
          💾 TO LIVE PAD
        </button>

        <button onClick={autoGenerateMelody} className="panel-btn action-btn" style={{ fontWeight: 'bold' }}>
          🎲 AUTO-GENERATE
        </button>

        <button onClick={() => { setNotes([]); if (setHasActiveBeat) setHasActiveBeat(false); }} className="panel-btn danger-icon-btn">
          CLEAR
        </button>
      </div>

      <div 
        className="roll-container" 
        style={{ 
          flex: 1, 
          minHeight: 0, 
          border: 'none', 
          background: '#111115', 
          position: 'relative', 
          display: 'flex', 
          overflowX: 'auto', 
          overflowY: 'auto' 
        }}
      >
        
        <div className="keyboard" style={{ position: 'sticky', left: 0, width: '70px', minWidth: '70px', background: '#141418', borderRight: '1px solid #000', zIndex: 60 }}>
          {allGridNotes.map((note, i) => (
            <div 
              key={`key-${i}`} 
              className="piano-key"
              style={{ 
                background: note.isRoot ? 'var(--accent)' : (note.isBlack ? '#111' : '#2a2a30'), 
                color: note.isRoot ? '#fff' : (note.inScale ? '#fff' : '#555'), 
                borderBottom: '1px solid #000', 
                height: '24px', 
                minHeight: '24px', 
                flexShrink: 0, 
                boxSizing: 'border-box',
                justifyContent: 'flex-end', 
                paddingRight: '8px',
                fontWeight: note.inScale ? 'bold' : 'normal',
                boxShadow: note.isBlack ? 'inset 0 0 5px rgba(0,0,0,0.8)' : 'none'
              }}
              onMouseDown={() => playSynthNote(note.freq, 0.25)}
            >
              <span>{note.name}</span>
            </div>
          ))}
        </div>

        <div 
          className="note-grid" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            position: 'relative', 
            minWidth: `${zoomLevel * 100}%`, 
            flex: 1 
          }} 
          onMouseUp={() => (dragMode.current = null)} 
          onMouseLeave={() => (dragMode.current = null)}
        >
          
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${(currentTick / (totalBeats * 48)) * 100}%`, 
            width: '2px', background: 'rgba(255, 255, 255, 0.8)',
            boxShadow: '0 0 10px rgba(255,255,255,0.8)', zIndex: 50, pointerEvents: 'none'
          }} />

          {allGridNotes.map((noteInfo, rowIndex) => {
            const rowBg = noteInfo.isRoot 
              ? 'rgba(166, 74, 255, 0.15)' 
              : noteInfo.inScale 
                ? 'rgba(255, 255, 255, 0.04)' 
                : 'transparent'; 

            return (
              <div 
                key={`row-${rowIndex}`} 
                className="grid-row" 
                style={{ 
                  height: '24px', 
                  minHeight: '24px', 
                  flexShrink: 0, 
                  display: 'flex', 
                  position: 'relative', 
                  borderBottom: '1px solid rgba(255,255,255,0.03)', 
                  background: rowBg, 
                  boxSizing: 'border-box' 
                }}
              >
                
                {Array.from({ length: gridColumns }).map((_, colIndex) => {
                  const cellBeat = colIndex * gridSnap;
                  const isBeatLine = (cellBeat + gridSnap) % 1 < 0.001; 
                  
                  return (
                    <div 
                      key={`cell-${colIndex}`} 
                      style={{ 
                        flex: 1, 
                        borderRight: isBeatLine ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.02)',
                        boxSizing: 'border-box'
                      }}
                      onMouseDown={(e) => {
                        if (e.button === 0) {
                          dragMode.current = "paint";
                          handleGridClick(rowIndex, cellBeat);
                        }
                      }}
                      onMouseEnter={() => {
                        if (dragMode.current === "paint" && drawTool === "brush") {
                          handleGridClick(rowIndex, cellBeat);
                        }
                      }}
                    />
                  );
                })}

                {notes.filter(n => n.row === rowIndex).map(note => (
                  <div
                    key={note.id}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      height: 'calc(100% - 4px)', 
                      left: `${(note.startBeat / totalBeats) * 100}%`,
                      width: `${(note.durationBeats / totalBeats) * 100}%`,
                      background: 'var(--accent)',
                      boxSizing: 'border-box',
                      border: '1px solid rgba(0, 0, 0, 0.8)', 
                      borderTop: '1px solid rgba(255, 255, 255, 0.4)', 
                      borderRadius: '3px',
                      boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.2)', 
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation(); 
                      if (e.button === 2) {
                        dragMode.current = "erase";
                        deleteNote(note.id);
                      }
                    }}
                    onMouseEnter={() => {
                      if (dragMode.current === "erase") deleteNote(note.id);
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}