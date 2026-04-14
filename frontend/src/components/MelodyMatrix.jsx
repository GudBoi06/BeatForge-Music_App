import React, { useState, useEffect, useRef, useMemo } from "react";
import { audioCtx, masterGain } from "../utils/audioEngine";
import "../styles/pianoroll.css";

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

const SCALES = {
  "Major":           [0,2,4,5,7,9,11],
  "Minor":           [0,2,3,5,7,8,10],
  "Pentatonic Minor":[0,3,5,7,10],
  "Harmonic Minor":  [0,2,3,5,7,8,11],
};

const SNAP_OPTIONS = [
  { label:"Bar",      value:4        },
  { label:"Beat",     value:1        },
  { label:"1/2 Beat", value:0.5      },
  { label:"1/3 Beat", value:1/3      },
  { label:"Step",     value:0.25     },
  { label:"1/2 Step", value:0.125    },
  { label:"1/3 Step", value:0.25/3   },
  { label:"1/4 Step", value:0.0625   },
];

const TICKS_PER_BEAT = 48;

// ─── Session helpers ──────────────────────────────────────────────────────────

const SESSION_KEY = "beatforge_melody_session";

const loadSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || {}; } catch { return {}; }
};

const fromSession = (key, fallback) => {
  const s = loadSession();
  return s[key] !== undefined ? s[key] : fallback;
};

// ─── Inline styles ────────────────────────────────────────────────────────────

const TOOLBAR_STYLES = `
  .custom-zoom-slider{-webkit-appearance:none;width:80px;background:transparent}
  .custom-zoom-slider::-webkit-slider-runnable-track{height:6px;background:#0a0a0c;border-radius:3px;border:1px solid #222}
  .custom-zoom-slider::-webkit-slider-thumb{-webkit-appearance:none;height:14px;width:14px;border-radius:50%;background:var(--accent,#a64aff);margin-top:-5px;cursor:ew-resize;box-shadow:0 0 10px rgba(166,74,255,.6);transition:all .2s}
  .custom-zoom-slider::-webkit-slider-thumb:hover{transform:scale(1.3);background:#fff}
  .magnet-dropdown{position:relative;user-select:none}
  .magnet-btn{display:flex;align-items:center;gap:8px;background:#000;border:1px solid #a64aff;border-radius:6px;padding:6px 12px;color:#00e676;font-weight:bold;font-size:13px;cursor:pointer;box-shadow:0 0 8px rgba(166,74,255,.3);transition:border-color .2s}
  .magnet-btn:hover{border-color:#c88cff}
  .magnet-menu{position:absolute;top:100%;left:0;margin-top:6px;background:#000;border:1px solid #333;border-radius:6px;width:140px;z-index:100;overflow:hidden;box-shadow:0 5px 15px rgba(0,0,0,.8)}
  .magnet-option{padding:8px 12px;color:#00e676;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:bold;transition:background .1s;border-bottom:1px solid #111}
  .magnet-option:hover{background:#1976D2;color:#fff}
  .tool-btn{padding:6px 10px;border:none;cursor:pointer;font-size:14px;transition:.1s}
  .tool-btn.active{background:var(--accent);color:#fff}
  .tool-btn.inactive{background:transparent;color:#555}
  .tool-btn.inactive:hover{background:rgba(255,255,255,.1);color:#fff}
  .roll-container::-webkit-scrollbar{height:14px;width:14px;background:#0f0f13}
  .roll-container::-webkit-scrollbar-track{background:#111;border-top:1px solid #222;border-left:1px solid #222}
  .roll-container::-webkit-scrollbar-thumb{background:#555;border-radius:8px;border:3px solid #111}
  .roll-container::-webkit-scrollbar-thumb:hover{background:#777}
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SaveModal({ name, setName, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:9999,backdropFilter:"blur(4px)" }}>
      <div style={{ background:"#111",padding:"30px",borderRadius:"12px",border:"1px solid #333",textAlign:"center",maxWidth:"350px",width:"100%",boxShadow:"0 10px 40px rgba(0,0,0,.8)" }}>
        <div style={{ fontSize:"45px",marginBottom:"10px" }}>🎹</div>
        <h3 style={{ margin:"0 0 12px 0",color:"#fff",fontSize:"20px",letterSpacing:"1px" }}>NAME YOUR MELODY</h3>
        <input
          autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onConfirm()}
          className="led-input"
          style={{ width:"100%",marginBottom:"20px",boxSizing:"border-box",textAlign:"center",fontSize:"16px",padding:"10px" }}
        />
        <div style={{ display:"flex",gap:"10px",justifyContent:"center" }}>
          <button className="panel-btn" onClick={onCancel} style={{ flex:1,background:"#222",color:"#fff",cursor:"pointer" }}>CANCEL</button>
          <button className="panel-btn action-btn" onClick={onConfirm} style={{ flex:1,background:"var(--accent)",color:"#fff",border:"none",cursor:"pointer",fontWeight:"bold" }}>SAVE TO PAD</button>
        </div>
      </div>
    </div>
  );
}

function PianoKey({ note, onPlay }) {
  return (
    <div
      className="piano-key"
      style={{
        background: note.isRoot ? "var(--accent)" : (note.isBlack ? "#111" : "#2a2a30"),
        color:      note.isRoot ? "#fff"           : (note.inScale ? "#fff" : "#555"),
        borderBottom:"1px solid #000", height:"24px", minHeight:"24px", flexShrink:0,
        boxSizing:"border-box", justifyContent:"flex-end", paddingRight:"8px",
        fontWeight: note.inScale ? "bold" : "normal",
        boxShadow:  note.isBlack ? "inset 0 0 5px rgba(0,0,0,.8)" : "none",
      }}
      onMouseDown={() => onPlay(note.freq, 0.25)}
    >
      <span>{note.name}</span>
    </div>
  );
}

function NoteBlock({ note, totalBeats, onRightClick, onEnter, onResizeStart }) {
  return (
    <div
      style={{
        position:"absolute", top:"2px", height:"calc(100% - 4px)",
        left:`${(note.startBeat / totalBeats) * 100}%`,
        width:`${(note.durationBeats / totalBeats) * 100}%`,
        background:"var(--accent)", boxSizing:"border-box",
        border:"1px solid rgba(0,0,0,.8)", borderTop:"1px solid rgba(255,255,255,.4)",
        borderRadius:"3px", boxShadow:"inset 0 -4px 8px rgba(0,0,0,.2)", zIndex:10,
      }}
      onMouseDown={e => { e.stopPropagation(); if (e.button === 2) onRightClick(); }}
      onMouseEnter={onEnter}
    >
      <div
        style={{ position:"absolute",right:0,top:0,bottom:0,width:"8px",cursor:"ew-resize",zIndex:20 }}
        onMouseDown={e => { e.stopPropagation(); if (e.button === 0) onResizeStart(); }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MelodyMatrix({
  isPlaying, activeStudioView, playbackStartTime,
  bpm, setBpm, stepsCount = 16, setStepsCount,
  setHasActiveBeat, projectPatterns, setProjectPatterns, currentUser,
}) {
  const [isLoaded,      setIsLoaded]      = useState(false);
  const [rootNote,      setRootNote]      = useState(() => fromSession("rootNote", 0));
  const [scaleType,     setScaleType]     = useState(() => fromSession("scaleType", "Minor"));
  const [gridSnap,      setGridSnap]      = useState(() => fromSession("gridSnap", 1));
  const [notes,         setNotes]         = useState(() => fromSession("notes", []));
  const [zoomLevel,     setZoomLevel]     = useState(1);
  const [isSnapOpen,    setIsSnapOpen]    = useState(false);
  const [drawTool,      setDrawTool]      = useState("pencil");
  const [currentTick,   setCurrentTick]   = useState(0);
  const [saveStatus,    setSaveStatus]    = useState("idle");
  const [showModal,     setShowModal]     = useState(false);
  const [livePadName,   setLivePadName]   = useState("");

  const intervalRef        = useRef(null);
  const dragMode           = useRef(null);
  const dropdownRef        = useRef(null);
  const resizeNoteId       = useRef(null);
  const activeNodesRef     = useRef([]);
  const lastTickRef        = useRef(-1);
  const notesRef           = useRef(notes);
  const scaleNotesRef      = useRef([]);
  const virtualStartRef    = useRef(0);
  const prevBpmRef         = useRef(bpm);
  const prevStepsRef       = useRef(stepsCount);

  const totalBeats = Number(stepsCount) / 4;
  const isCurrentlyPlaying = isPlaying && (activeStudioView === "beatmaker" || activeStudioView === "sequencer");

  // ── Derived note grid ──────────────────────────────────────────────────────

  const allGridNotes = useMemo(() => {
    const arr = [];
    for (let oct = 2; oct >= -1; oct--) {
      for (let n = 11; n >= 0; n--) {
        const interval = (n - rootNote + 12) % 12;
        arr.push({
          name:    `${ALL_NOTES[n]}${4 + oct}`,
          freq:    261.63 * Math.pow(2, (n + oct * 12) / 12),
          isBlack: [1,3,6,8,10].includes(n),
          inScale: SCALES[scaleType].includes(interval),
          isRoot:  interval === 0,
        });
      }
    }
    return arr;
  }, [rootNote, scaleType]);

  // ── Sync refs ──────────────────────────────────────────────────────────────

  useEffect(() => { notesRef.current     = notes;        }, [notes]);
  useEffect(() => { scaleNotesRef.current = allGridNotes; }, [allGridNotes]);

  // ── Init from session ──────────────────────────────────────────────────────

  useEffect(() => {
    const s = loadSession();
    if (s.bpm        && setBpm)           setBpm(s.bpm);
    if (s.stepsCount && setStepsCount)    setStepsCount(s.stepsCount);
    if (s.notes?.length && setHasActiveBeat) setHasActiveBeat(true);
    setTimeout(() => setIsLoaded(true), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist session ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ notes, rootNote, scaleType, gridSnap, bpm, stepsCount }));
  }, [notes, rootNote, scaleType, gridSnap, bpm, stepsCount, isLoaded]);

  // ── Close snap dropdown on outside click ──────────────────────────────────

  useEffect(() => {
    const onDown = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsSnapOpen(false); };
    const onUp   = ()  => { dragMode.current = null; resizeNoteId.current = null; };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Stop audio when playback stops ────────────────────────────────────────

  useEffect(() => {
    if (!isCurrentlyPlaying) {
      activeNodesRef.current.forEach(n => { try { n.stop(); } catch {} });
      activeNodesRef.current = [];
    }
  }, [isCurrentlyPlaying]);

  // ── Audio synthesis ────────────────────────────────────────────────────────

  const playSynthNote = (freq, durationInSeconds) => {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    const osc    = audioCtx.createOscillator();
    const gain   = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    const t      = audioCtx.currentTime;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + durationInSeconds * 0.9);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.setValueAtTime(0.3, t + Math.max(0, durationInSeconds - 0.05));
    gain.gain.linearRampToValueAtTime(0.001, t + durationInSeconds);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(t + durationInSeconds + 0.1);

    activeNodesRef.current.push(osc);
    osc.onended = () => { activeNodesRef.current = activeNodesRef.current.filter(n => n !== osc); };
  };

  // ── Playback scheduler ─────────────────────────────────────────────────────

  useEffect(() => {
    const numericSteps = Number(stepsCount);

    if (!isCurrentlyPlaying || !playbackStartTime) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
      setCurrentTick(0);
      lastTickRef.current    = -1;
      virtualStartRef.current = 0;
      return;
    }

    if (Date.now() - playbackStartTime > 500 && lastTickRef.current === -1) return;

    if (!virtualStartRef.current || lastTickRef.current === -1) {
      virtualStartRef.current = playbackStartTime;
      prevBpmRef.current   = bpm;
      prevStepsRef.current = numericSteps;
    }

    // Recalculate virtual start when BPM or steps change mid-playback
    if (bpm !== prevBpmRef.current || numericSteps !== prevStepsRef.current) {
      const oldTickMs   = (60000 / prevBpmRef.current) / TICKS_PER_BEAT;
      const oldTotal    = (prevStepsRef.current / 4) * TICKS_PER_BEAT;
      const elapsed     = Date.now() - virtualStartRef.current;
      const oldTick     = Math.floor(elapsed / oldTickMs) % oldTotal;
      const remainder   = elapsed % oldTickMs;

      const newTickMs   = (60000 / bpm) / TICKS_PER_BEAT;
      const newTotal    = (numericSteps / 4) * TICKS_PER_BEAT;
      const wrappedTick = oldTick % newTotal;

      virtualStartRef.current = Date.now() - (wrappedTick * newTickMs) - (remainder / oldTickMs * newTickMs);
      prevBpmRef.current   = bpm;
      prevStepsRef.current = numericSteps;
      lastTickRef.current  = wrappedTick;
    }

    clearTimeout(intervalRef.current);
    if (audioCtx?.state === "suspended") audioCtx.resume();

    const tickMs     = (60000 / bpm) / TICKS_PER_BEAT;
    const totalTicks = totalBeats * TICKS_PER_BEAT;

    const scheduleNextTick = () => {
      const elapsed  = Date.now() - virtualStartRef.current;
      const absTick  = Math.floor(elapsed / tickMs);
      const loopTick = absTick % totalTicks;

      if (loopTick !== lastTickRef.current) {
        // Build set of ticks to process (handles loop wraparound)
        const toProcess = new Set();
        if (lastTickRef.current === -1) {
          for (let t = 0; t <= loopTick; t++) toProcess.add(t);
        } else if (loopTick > lastTickRef.current) {
          for (let t = lastTickRef.current + 1; t <= loopTick; t++) toProcess.add(t);
        } else {
          for (let t = lastTickRef.current + 1; t < totalTicks; t++) toProcess.add(t);
          for (let t = 0; t <= loopTick; t++) toProcess.add(t);
        }

        notesRef.current.forEach(note => {
          const startTick = Math.round(note.startBeat * TICKS_PER_BEAT);
          if (toProcess.has(startTick)) {
            playSynthNote(scaleNotesRef.current[note.row].freq, (60 / bpm) * note.durationBeats);
          }
        });

        setCurrentTick(loopTick);
        lastTickRef.current = loopTick;
      }

      const nextTickTime = virtualStartRef.current + (absTick + 1) * tickMs;
      intervalRef.current = setTimeout(scheduleNextTick, Math.max(0, nextTickTime - Date.now()));
    };

    scheduleNextTick();
    return () => clearTimeout(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentlyPlaying, playbackStartTime, bpm, totalBeats, stepsCount]);

  // ── Grid interactions ──────────────────────────────────────────────────────

  const handleGridClick = (row, startBeat) => {
    if (setHasActiveBeat) setHasActiveBeat(true);
    const newEnd = startBeat + gridSnap;

    setNotes(prev => {
      const filtered = prev.filter(n => n.row !== row || !(startBeat < n.startBeat + n.durationBeats && newEnd > n.startBeat));
      return [...filtered, { id: Date.now() + Math.random(), row, startBeat, durationBeats: gridSnap }];
    });

    playSynthNote(allGridNotes[row].freq, (60 / bpm) * gridSnap);
  };

  const deleteNote = id => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      if (next.length === 0 && setHasActiveBeat) setHasActiveBeat(false);
      return next;
    });
  };

  const handleGridMouseMove = e => {
    if (dragMode.current !== "resize" || !resizeNoteId.current) return;
    const rect    = e.currentTarget.getBoundingClientRect();
    const beat    = ((Math.max(0, e.clientX - rect.left)) / rect.width) * totalBeats;
    const snapped = Math.round(beat / gridSnap) * gridSnap;

    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === resizeNoteId.current);
      if (idx === -1) return prev;
      const n    = prev[idx];
      const newD = Math.max(gridSnap, snapped - n.startBeat);
      if (Math.abs(n.durationBeats - newD) < 0.001) return prev;
      const copy = [...prev];
      copy[idx]  = { ...n, durationBeats: newD };
      return copy;
    });
  };

  // ── Save to Live Pad ───────────────────────────────────────────────────────

  const initiateSave = () => {
    if (notes.length === 0) {
      setSaveStatus("empty");
      setTimeout(() => setSaveStatus("idle"), 2000);
      return;
    }
    const count = (projectPatterns || []).filter(p => p.type === "melody").length + 1;
    setLivePadName(`Melody ${count}`);
    setShowModal(true);
  };

  const confirmSave = () => {
    const name = livePadName.trim() || `Melody ${(projectPatterns || []).filter(p => p.type === "melody").length + 1}`;
    if (setProjectPatterns) {
      setProjectPatterns(prev => [...(prev || []), {
        id: `melody-${Date.now()}`, type:"melody", name,
        data:[...notes], scale:scaleType, root:rootNote, stepsCount:Number(stepsCount),
      }]);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
    setShowModal(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const gridColumns = Math.round(totalBeats / gridSnap);
  const saveBtnBg   = saveStatus === "empty" ? "#ff4757" : saveStatus === "saved" ? "#00e676" : "var(--accent)";
  const saveBtnText = saveStatus === "empty" ? "⚠️ EMPTY" : saveStatus === "saved" ? "✔️ SAVED" : "💾 TO LIVE PAD";

  return (
    <div
      className="piano-roll-workspace"
      onContextMenu={e => e.preventDefault()}
      style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0, overflow:"hidden" }}
    >
      {showModal && (
        <SaveModal
          name={livePadName} setName={setLivePadName}
          onConfirm={confirmSave} onCancel={() => setShowModal(false)}
        />
      )}

      <style>{TOOLBAR_STYLES}</style>

      {/* ── Toolbar ── */}
      <div className="roll-header-bar" style={{ display:"flex", flexWrap:"wrap", gap:"15px", flexShrink:0 }}>
        <div className="sequencer-header">
          <div className="header-icon">🧬</div>
          <h2 className="workspace-title">Melody Matrix</h2>
        </div>

        <div className="hardware-panel" style={{ flexDirection:"row", padding:"6px 12px" }}>

          <select className="led-select" value={rootNote} onChange={e => setRootNote(Number(e.target.value))} style={{ width:"60px" }}>
            {ALL_NOTES.map((n, i) => <option key={i} value={i}>{n}</option>)}
          </select>

          <select className="led-select" value={scaleType} onChange={e => setScaleType(e.target.value)}>
            {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="panel-divider" />

          {/* Snap dropdown */}
          <div className="magnet-dropdown" ref={dropdownRef}>
            <div className="magnet-btn" onClick={() => setIsSnapOpen(o => !o)}>
              🧲 {SNAP_OPTIONS.find(o => Math.abs(o.value - gridSnap) < 0.001)?.label || "Snap"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:"12px", height:"12px", marginLeft:"auto" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {isSnapOpen && (
              <div className="magnet-menu" style={{ maxHeight:"300px", overflowY:"auto" }}>
                {SNAP_OPTIONS.map((opt, i) => (
                  <div key={i} className="magnet-option" onClick={() => { setGridSnap(opt.value); setIsSnapOpen(false); }}>
                    🧲 {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-divider" />

          {/* Draw tools */}
          <div style={{ display:"flex", background:"#000", borderRadius:"4px", border:"1px solid #333", overflow:"hidden" }}>
            {[["pencil","✏️","Pencil (Draw one note per click)"],["brush","🖌️","Paintbrush (Click and drag to paint notes)"]].map(([tool, icon, tip]) => (
              <button key={tool} className={`tool-btn ${drawTool === tool ? "active" : "inactive"}`} onClick={() => setDrawTool(tool)} title={tip}>{icon}</button>
            ))}
          </div>

          <div className="panel-divider" />

          {/* Zoom */}
          <div style={{ display:"flex", alignItems:"center", gap:"8px", background:"#141419", padding:"0 10px", borderRadius:"4px", border:"1px solid #222" }}>
            <span title="Zoom Grid" style={{ fontSize:"12px", color:"var(--text-muted)" }}>🔍</span>
            <input type="range" min="1" max="4" step="0.1" value={zoomLevel} onChange={e => setZoomLevel(Number(e.target.value))} className="custom-zoom-slider" />
          </div>
        </div>

        <div style={{ flex:1 }} />

        <button onClick={initiateSave} className="panel-btn action-btn" style={{ fontWeight:"bold", background:saveBtnBg, color:"#fff", border:"none", transition:"all .2s", width:"130px", justifyContent:"center" }}>
          {saveBtnText}
        </button>

        <button onClick={() => { setNotes([]); if (setHasActiveBeat) setHasActiveBeat(false); }} className="panel-btn danger-icon-btn">
          CLEAR
        </button>
      </div>

      {/* ── Piano Roll ── */}
      <div
        className="roll-container"
        style={{ flex:1, minHeight:0, border:"none", background:"#111115", position:"relative", display:"flex", overflowX:"auto", overflowY:"auto" }}
      >
        {/* Piano keyboard */}
        <div className="keyboard" style={{ position:"sticky", left:0, width:"70px", minWidth:"70px", background:"#141418", borderRight:"1px solid #000", zIndex:60, minHeight:"max-content" }}>
          {allGridNotes.map((note, i) => (
            <PianoKey key={`key-${i}`} note={note} onPlay={playSynthNote} />
          ))}
        </div>

        {/* Note grid */}
        <div
          className="note-grid"
          style={{ display:"flex", flexDirection:"column", position:"relative", minWidth:`${zoomLevel * 100}%`, flex:1, minHeight:"max-content", userSelect:"none" }}
          onMouseMove={handleGridMouseMove}
        >
          {/* Playhead */}
          <div style={{
            position:"absolute", top:0,
            height:`${allGridNotes.length * 24}px`,
            left:`${(currentTick / (totalBeats * TICKS_PER_BEAT)) * 100}%`,
            width:"2px", background:"rgba(255,255,255,.8)",
            boxShadow:"0 0 10px rgba(255,255,255,.8)", zIndex:50, pointerEvents:"none",
          }} />

          {/* Rows */}
          {allGridNotes.map((noteInfo, rowIndex) => {
            const rowBg = noteInfo.isRoot ? "rgba(166,74,255,.15)" : noteInfo.inScale ? "rgba(255,255,255,.04)" : "transparent";
            return (
              <div
                key={`row-${rowIndex}`}
                className="grid-row"
                style={{ height:"24px", minHeight:"24px", flexShrink:0, display:"flex", position:"relative", borderBottom:"1px solid rgba(255,255,255,.03)", background:rowBg, boxSizing:"border-box" }}
              >
                {/* Grid cells */}
                {Array.from({ length: gridColumns }).map((_, col) => {
                  const cellBeat   = col * gridSnap;
                  const isBeatLine = (cellBeat + gridSnap) % 1 < 0.001;
                  return (
                    <div
                      key={`cell-${col}`}
                      style={{ flex:1, borderRight: isBeatLine ? "1px solid rgba(255,255,255,.15)" : "1px solid rgba(255,255,255,.02)", boxSizing:"border-box" }}
                      onMouseDown={e => { if (e.button === 0) { dragMode.current = "paint"; handleGridClick(rowIndex, cellBeat); } }}
                      onMouseEnter={() => { if (dragMode.current === "paint" && drawTool === "brush") handleGridClick(rowIndex, cellBeat); }}
                    />
                  );
                })}

                {/* Placed notes */}
                {notes.filter(n => n.row === rowIndex).map(note => (
                  <NoteBlock
                    key={note.id} note={note} totalBeats={totalBeats}
                    onRightClick={() => { dragMode.current = "erase"; deleteNote(note.id); }}
                    onEnter={() => { if (dragMode.current === "erase") deleteNote(note.id); }}
                    onResizeStart={() => { dragMode.current = "resize"; resizeNoteId.current = note.id; }}
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