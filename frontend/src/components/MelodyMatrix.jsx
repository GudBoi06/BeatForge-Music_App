import React, { useState, useEffect, useRef, useMemo } from "react";
import { audioCtx, masterGain } from "../utils/audioEngine"; 
import "../styles/pianoroll.css"; 

const ALL_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALES = {
  "Major": [0, 2, 4, 5, 7, 9, 11],
  "Minor": [0, 2, 3, 5, 7, 8, 10],
  "Pentatonic Minor": [0, 3, 5, 7, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11]
};

export default function MelodyMatrix({ isPlaying, activeStudioView, playbackStartTime, bpm, setBpm, stepsCount = 16, setStepsCount, setHasActiveBeat, projectPatterns, setProjectPatterns, currentUser }) {
  const [isLoaded, setIsLoaded] = useState(false);

  const [rootNote, setRootNote] = useState(() => {
    const saved = localStorage.getItem("beatforge_melody_session");
    return saved && JSON.parse(saved).rootNote !== undefined ? JSON.parse(saved).rootNote : 0;
  }); 

  const [scaleType, setScaleType] = useState(() => {
    const saved = localStorage.getItem("beatforge_melody_session");
    return saved && JSON.parse(saved).scaleType ? JSON.parse(saved).scaleType : "Minor";
  });
  
  const [gridSnap, setGridSnap] = useState(() => {
    const saved = localStorage.getItem("beatforge_melody_session");
    return saved && JSON.parse(saved).gridSnap ? JSON.parse(saved).gridSnap : 1;
  }); 

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("beatforge_melody_session");
    return saved && JSON.parse(saved).notes ? JSON.parse(saved).notes : [];
  });

  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSnapMenuOpen, setIsSnapMenuOpen] = useState(false);
  const [drawTool, setDrawTool] = useState("pencil"); 
  const [currentTick, setCurrentTick] = useState(0); 
  
  const intervalRef = useRef(null);
  const dragMode = useRef(null);
  const dropdownRef = useRef(null);
  const resizeNoteId = useRef(null);

  const activeAudioNodesRef = useRef([]);

  const lastPlayedTickRef = useRef(-1);
  const totalBeats = Number(stepsCount) / 4; 
  const isCurrentlyPlaying = isPlaying && (activeStudioView === "beatmaker" || activeStudioView === "sequencer");

  const [saveStatus, setSaveStatus] = useState("idle");
  const [showLivePadModal, setShowLivePadModal] = useState(false);
  const [livePadName, setLivePadName] = useState("");

  const prevBpmRef = useRef(bpm);
  const prevStepsCountRef = useRef(stepsCount);
  const virtualStartTimeRef = useRef(0);

  useEffect(() => {
    if (!isCurrentlyPlaying) {
      activeAudioNodesRef.current.forEach(node => {
        try { node.stop(); } catch (e) {}
      });
      activeAudioNodesRef.current = [];
    }
  }, [isCurrentlyPlaying]);

  useEffect(() => {
    const saved = localStorage.getItem("beatforge_melody_session");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.bpm && setBpm) setBpm(parsed.bpm);
      if (parsed.stepsCount && setStepsCount) setStepsCount(parsed.stepsCount);
      if (parsed.notes && parsed.notes.length > 0 && setHasActiveBeat) {
        setHasActiveBeat(true);
      }
    }
    setTimeout(() => setIsLoaded(true), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const session = { notes, rootNote, scaleType, gridSnap, bpm, stepsCount };
    localStorage.setItem("beatforge_melody_session", JSON.stringify(session));
  }, [notes, rootNote, scaleType, gridSnap, bpm, stepsCount, isLoaded]);

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
    
    const handleGlobalMouseUp = () => {
      dragMode.current = null;
      resizeNoteId.current = null;
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  const playSynthNote = (freq, durationInSeconds) => {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "sawtooth"; 
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + (durationInSeconds * 0.9));

    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02); 
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + Math.max(0, durationInSeconds - 0.05)); 
    gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + durationInSeconds); 

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain); 

    osc.start();
    osc.stop(audioCtx.currentTime + durationInSeconds + 0.1);
    
    activeAudioNodesRef.current.push(osc);
    osc.onended = () => {
      activeAudioNodesRef.current = activeAudioNodesRef.current.filter(n => n !== osc);
    };
  };

  useEffect(() => {
    const numericSteps = Number(stepsCount);

    if (!isCurrentlyPlaying || !playbackStartTime) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
      setCurrentTick(0);
      lastPlayedTickRef.current = -1;
      virtualStartTimeRef.current = 0;
      return;
    }
    
    if (Date.now() - playbackStartTime > 500 && lastPlayedTickRef.current === -1) {
      return; 
    }

    if (!virtualStartTimeRef.current || lastPlayedTickRef.current === -1) {
      virtualStartTimeRef.current = playbackStartTime;
      prevBpmRef.current = bpm;
      prevStepsCountRef.current = numericSteps;
    }

    if (bpm !== prevBpmRef.current || numericSteps !== prevStepsCountRef.current) {
      const TICKS_PER_BEAT = 48;
      const oldTickDurationMs = (60000 / prevBpmRef.current) / TICKS_PER_BEAT;
      const OLD_TOTAL_TICKS = (prevStepsCountRef.current / 4) * TICKS_PER_BEAT;
      
      const elapsedOld = Date.now() - virtualStartTimeRef.current;
      
      const absoluteOldTick = Math.floor(elapsedOld / oldTickDurationMs);
      const currentOldTick = absoluteOldTick % OLD_TOTAL_TICKS;
      const remainderMs = elapsedOld % oldTickDurationMs;
      
      const newTickDurationMs = (60000 / bpm) / TICKS_PER_BEAT;
      const NEW_TOTAL_TICKS = (numericSteps / 4) * TICKS_PER_BEAT;
      
      const wrappedNewTick = currentOldTick % NEW_TOTAL_TICKS;
      
      const equivalentElapsedNew = (wrappedNewTick * newTickDurationMs) + ((remainderMs / oldTickDurationMs) * newTickDurationMs);
      
      virtualStartTimeRef.current = Date.now() - equivalentElapsedNew;
      
      prevBpmRef.current = bpm;
      prevStepsCountRef.current = numericSteps;
      lastPlayedTickRef.current = wrappedNewTick; 
    }

    clearTimeout(intervalRef.current);
    if (audioCtx?.state === "suspended") audioCtx.resume();
    
    const TICKS_PER_BEAT = 48; 
    const tickDurationMs = (60000 / bpm) / TICKS_PER_BEAT; 
    const TOTAL_TICKS = totalBeats * TICKS_PER_BEAT; 

    const scheduleNextTick = () => {
      const elapsedMs = Date.now() - virtualStartTimeRef.current;
      const absoluteTick = Math.floor(elapsedMs / tickDurationMs);
      const currentLoopTick = absoluteTick % TOTAL_TICKS;

      if (currentLoopTick !== lastPlayedTickRef.current) {
        const ticksToProcess = new Set();
        
        if (lastPlayedTickRef.current === -1) {
          for (let t = 0; t <= currentLoopTick; t++) {
            ticksToProcess.add(t);
          }
        } else if (currentLoopTick > lastPlayedTickRef.current) {
          for (let t = lastPlayedTickRef.current + 1; t <= currentLoopTick; t++) {
            ticksToProcess.add(t);
          }
        } else {
          for (let t = lastPlayedTickRef.current + 1; t < TOTAL_TICKS; t++) {
            ticksToProcess.add(t);
          }
          for (let t = 0; t <= currentLoopTick; t++) {
            ticksToProcess.add(t);
          }
        }

        notesRef.current.forEach(note => {
          const noteStartTick = Math.round(note.startBeat * TICKS_PER_BEAT);
          if (ticksToProcess.has(noteStartTick)) {
            const durationInSecs = (60 / bpm) * note.durationBeats;
            playSynthNote(scaleNotesRef.current[note.row].freq, durationInSecs);
          }
        });

        setCurrentTick(currentLoopTick);
        lastPlayedTickRef.current = currentLoopTick;
      }

      const nextAbsoluteTick = absoluteTick + 1;
      const timeOfNextTick = virtualStartTimeRef.current + (nextAbsoluteTick * tickDurationMs);
      const timeUntilNext = Math.max(0, timeOfNextTick - Date.now());

      intervalRef.current = setTimeout(scheduleNextTick, timeUntilNext);
    };

    scheduleNextTick();
    
    return () => clearTimeout(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentlyPlaying, playbackStartTime, bpm, totalBeats, stepsCount]); 

  const handleGridClick = (row, startBeat) => {
    if (setHasActiveBeat) setHasActiveBeat(true);
    
    const newEndBeat = startBeat + gridSnap;
    
    setNotes(prevNotes => {
      const filteredNotes = prevNotes.filter(n => {
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

      return [...filteredNotes, newNote];
    });

    playSynthNote(allGridNotes[row].freq, (60 / bpm) * gridSnap);
  };

  const deleteNote = (noteId) => {
    setNotes(prev => {
      const newNotes = prev.filter(n => n.id !== noteId);
      if (newNotes.length === 0 && setHasActiveBeat) setHasActiveBeat(false);
      return newNotes;
    });
  };

  const initiateSaveToLivePad = () => {
    if (notes.length === 0) {
      setSaveStatus("empty");
      setTimeout(() => setSaveStatus("idle"), 2000);
      return;
    }
    const patternCount = (projectPatterns || []).filter(p => p.type === 'melody').length + 1;
    setLivePadName(`Melody ${patternCount}`); 
    setShowLivePadModal(true);
  };

  const confirmSaveToLivePad = () => {
    const finalName = livePadName.trim() || `Melody ${(projectPatterns || []).filter(p => p.type === 'melody').length + 1}`;
    
    const newPattern = {
      id: `melody-${Date.now()}`,
      type: 'melody',
      name: finalName,
      data: [...notes], 
      scale: scaleType,
      root: rootNote,
      stepsCount: Number(stepsCount) 
    };

    if (setProjectPatterns) {
      setProjectPatterns(prev => [...(prev || []), newPattern]);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
    setShowLivePadModal(false);
  };

  const handleGridMouseMove = (e) => {
    if (dragMode.current === "resize" && resizeNoteId.current) {
      const gridRect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, e.clientX - gridRect.left);
      const beatAtMouse = (x / gridRect.width) * totalBeats;
      const snappedBeat = Math.round(beatAtMouse / gridSnap) * gridSnap;

      setNotes(prev => {
        const noteIndex = prev.findIndex(n => n.id === resizeNoteId.current);
        if (noteIndex === -1) return prev;
        const n = prev[noteIndex];
        const newDuration = Math.max(gridSnap, snappedBeat - n.startBeat);
        if (Math.abs(n.durationBeats - newDuration) < 0.001) return prev;
        const copy = [...prev];
        copy[noteIndex] = { ...n, durationBeats: newDuration };
        return copy;
      });
    }
  };

  const gridColumns = Math.round(totalBeats / gridSnap); 

  const snapOptions = [
    { label: "Bar", value: 4 },
    { label: "Beat", value: 1 },
    { label: "1/2 Beat", value: 0.5 },
    { label: "1/3 Beat", value: 1/3 },
    { label: "Step", value: 0.25 },
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
      {showLivePadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #333', textAlign: 'center', maxWidth: '350px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: '45px', marginBottom: '10px' }}>🎹</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '20px', letterSpacing: '1px' }}>NAME YOUR MELODY</h3>
            
            <input 
              autoFocus
              type="text" 
              value={livePadName} 
              onChange={(e) => setLivePadName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmSaveToLivePad()} 
              className="led-input" 
              style={{ width: '100%', marginBottom: '20px', boxSizing: 'border-box', textAlign: 'center', fontSize: '16px', padding: '10px' }} 
            />
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="panel-btn" onClick={() => setShowLivePadModal(false)} style={{ flex: 1, background: '#222', color: '#fff', cursor: 'pointer' }}>CANCEL</button>
              <button className="panel-btn action-btn" onClick={confirmSaveToLivePad} style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>SAVE TO PAD</button>
            </div>
          </div>
        </div>
      )}

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

        <button 
          onClick={initiateSaveToLivePad} 
          className="panel-btn action-btn" 
          style={{ 
            fontWeight: 'bold', 
            background: saveStatus === 'empty' ? '#ff4757' : (saveStatus === 'saved' ? '#00e676' : 'var(--accent)'), 
            color: '#fff', 
            border: 'none',
            transition: 'all 0.2s',
            width: '130px', 
            justifyContent: 'center'
          }}
        >
          {saveStatus === 'empty' ? '⚠️ EMPTY' : saveStatus === 'saved' ? '✔️ SAVED' : '💾 TO LIVE PAD'}
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
        
        <div className="keyboard" style={{ position: 'sticky', left: 0, width: '70px', minWidth: '70px', background: '#141418', borderRight: '1px solid #000', zIndex: 60, minHeight: 'max-content' }}>
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
            flex: 1,
            minHeight: 'max-content',
            userSelect: 'none'
          }} 
          onMouseMove={handleGridMouseMove}
        >
          
          <div style={{
            position: 'absolute', top: 0, 
            height: `${allGridNotes.length * 24}px`, 
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
                  >
                    <div 
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '8px',
                        cursor: 'ew-resize',
                        zIndex: 20
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (e.button === 0) {
                          dragMode.current = "resize";
                          resizeNoteId.current = note.id;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}