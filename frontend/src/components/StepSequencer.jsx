import React, { useState, useRef, useEffect, useMemo } from "react";
import Knob from "./common/Knob";
import Mixer from "./Mixer";
import { audioCtx, masterGain } from "../utils/audioEngine";
import "../styles/sequencer.css";

// ─── Static data ──────────────────────────────────────────────────────────────

const DRUM_KITS = [
  { name: "MODERN 808",    sounds: [{ name: "808 Kick",      file: "/sounds/kick.wav" },         { name: "808 Snare",      file: "/sounds/snare.wav" },         { name: "808 Hat",      file: "/sounds/hihat.wav" }] },
  { name: "ACOUSTIC",      sounds: [{ name: "Acoustic Kick", file: "/sounds/kick-acoustic.wav" }, { name: "Acoustic Snare", file: "/sounds/snare-acoustic.wav" }, { name: "Acoustic Hat", file: "/sounds/hihat-acoustic.wav" }] },
  { name: "SYNTHWAVE",     sounds: [{ name: "Retro Kick",    file: "/sounds/kick-retro.wav" },    { name: "Retro Snare",    file: "/sounds/snare-retro.wav" },    { name: "Retro Hat",    file: "/sounds/hihat-retro.wav" }] },
  { name: "LO-FI CHILL",  sounds: [{ name: "Lofi Kick",     file: "/sounds/kick-lofi.wav" },     { name: "Lofi Snare",     file: "/sounds/snare-lofi.wav" },     { name: "Lofi Hat",     file: "/sounds/hihat-lofi.wav" }] },
  { name: "TECHNO HOUSE",  proOnly: true, sounds: [{ name: "Punch Kick", file: "/sounds/kick-techno.wav" },   { name: "Clap Snare",  file: "/sounds/snare-techno.wav" },   { name: "Open Hat",  file: "/sounds/hihat-techno.wav" }] },
  { name: "DUBSTEP GRIME", proOnly: true, sounds: [{ name: "Heavy Kick", file: "/sounds/kick-dubstep.wav" },  { name: "Slap Snare",  file: "/sounds/snare-dubstep.wav" },  { name: "Crisp Hat", file: "/sounds/hihat-dubstep.wav" }] },
  { name: "USER KIT",      proOnly: true, sounds: [{ name: "Custom Kick", file: "/sounds/kick.wav" }] },
];

// ─── SVG icon map ────────────────────────────────────────────────────────────

const Svg = (paths, extra) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...extra}>{paths}</svg>;
const Icon = {
  grid:  Svg(<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>),
  prev:  Svg(<polyline points="15 18 9 12 15 6"/>),
  next:  Svg(<polyline points="9 18 15 12 9 6"/>),
  save:  Svg(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>),
  trash: Svg(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>),
  clear: Svg(<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>),
  mixer: Svg(<><path d="M4 22v-7"/><path d="M4 11V2"/><path d="M20 22v-5"/><path d="M20 13V2"/><path d="M12 22v-11"/><path d="M12 7V2"/><line x1="2" y1="11" x2="6" y2="11"/><line x1="10" y1="7" x2="14" y2="7"/><line x1="18" y1="13" x2="22" y2="13"/></>, { width: 16, height: 16 }),
  plus:  Svg(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, { style: { marginRight: 8, width: 16 } }),
  dots:  Svg(<><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>, { width: 16, height: 16 }),
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const initKits = (kits, defaultSteps = 16) =>
  kits.map(kit => {
    const st = kit.stepsCount || defaultSteps;
    return {
      ...kit,
      stepsCount:  st,
      grid:        kit.grid        || Array.from({ length: kit.sounds.length }, () => Array(st).fill(false)),
      volumes:     kit.volumes     || Array(kit.sounds.length).fill(1),
      mutedTracks: kit.mutedTracks || Array(kit.sounds.length).fill(false),
    };
  });

const loadSession = () => { try { return JSON.parse(localStorage.getItem("beatforge_seq_session") || "{}"); } catch { return {}; } };

const Modal = ({ children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
    <div style={{ background: "#111", padding: 30, borderRadius: 12, border: "1px solid #333", textAlign: "center", maxWidth: 350, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.8)" }}>
      {children}
    </div>
  </div>
);

export default function StepSequencer({
  isPlaying, activeStudioView, playbackStartTime, bpm, setBpm,
  currentUser, setHasActiveBeat, stepsCount, setStepsCount,
  mySamples, projectPatterns, setProjectPatterns,
}) {
  const s0 = loadSession();

  // State 
  const [isLoaded,            setIsLoaded]            = useState(false);
  const [kits,                setKits]                = useState(() => initKits(s0.kits || DRUM_KITS, 16));
  const [currentKitIndex,     setCurrentKitIndex]     = useState(() => s0.kitIndex ?? 0);
  const [currentStep,         setCurrentStep]         = useState(0);
  const [showMixer,           setShowMixer]           = useState(false);
  const [showProModal,        setShowProModal]        = useState(false);
  const [showLivePadModal,    setShowLivePadModal]    = useState(false);
  const [livePadName,         setLivePadName]         = useState("");
  const [saveStatus,          setSaveStatus]          = useState("idle");
  const [presets,             setPresets]             = useState([]);
  const [presetName,          setPresetName]          = useState("");
  const [presetSaveStatus,    setPresetSaveStatus]    = useState("idle");
  const [presetToDeleteIndex, setPresetToDeleteIndex] = useState(null);
  const [contextMenu,         setContextMenu]         = useState({ visible: false, x: 0, y: 0, rowIndex: null, startStep: 0 });

  // Derived 
  const currentKit     = kits[currentKitIndex] || kits[0];
  const kitSteps       = currentKit.stepsCount || 16;
  const currentSounds  = useMemo(() => currentKit.sounds || [],      [currentKit.sounds]);
  const grid           = useMemo(() => currentKit.grid || [],        [currentKit.grid]);
  const volumes        = useMemo(() => currentKit.volumes || [],     [currentKit.volumes]);
  const mutedTracks    = useMemo(() => currentKit.mutedTracks || [], [currentKit.mutedTracks]);
  const isLocked       = currentKit?.proOnly && !currentUser?.isPro;
  const isCurrentlyPlaying = isPlaying && (activeStudioView === "sequencer" || activeStudioView === "beatmaker");

  //  Refs 
  const gridRef        = useRef(grid);
  const volumeRef      = useRef(volumes);
  const mutedRef       = useRef(mutedTracks);
  const soundsRef      = useRef(currentSounds);
  const fileInputRef   = useRef(null);
  const intervalRef    = useRef(null);
  const dragMode       = useRef(null);
  const isDraggingRef  = useRef(false);
  const lastStepRef    = useRef(-1);
  const activeNodes    = useRef([]);
  const prevBpmRef     = useRef(bpm);
  const prevStepsRef   = useRef(kitSteps);
  const vStartRef      = useRef(0);
  const buffersRef     = useRef({});
  const prevUserRef    = useRef(currentUser);
  const prevSamplesRef = useRef(mySamples);

  const updateKit = (fn) =>
    setKits(prev => { const c = [...prev]; c[currentKitIndex] = fn({ ...c[currentKitIndex] }); return c; });

  const flash = (set, val, ms = 2000) => { set(val); setTimeout(() => set("idle"), ms); };

  const addSound = (sound) =>
    updateKit(k => ({ ...k, sounds: [...k.sounds, sound], grid: [...k.grid, Array(k.stepsCount || 16).fill(false)], volumes: [...k.volumes, 1], mutedTracks: [...k.mutedTracks, false] }));

  const handleKitChange = (direction) => {
    const newIdx = direction === -1 ? (currentKitIndex === 0 ? kits.length - 1 : currentKitIndex - 1) : (currentKitIndex + 1) % kits.length;
    setCurrentKitIndex(newIdx);
    if (setStepsCount) setStepsCount(kits[newIdx].stepsCount || 16);
  };

  const handleStepsChange = (val) => {
    const n = Number(val);
    if (setStepsCount) setStepsCount(n);
    updateKit(k => ({ 
      ...k, 
      stepsCount: n, 
      grid: k.grid.map(r => { const row = r || []; if (row.length < n) return [...row, ...Array(n - row.length).fill(false)]; if (row.length > n) return row.slice(0, n); return row; }) 
    }));
  };

  // Sync refs 
  useEffect(() => { gridRef.current = grid; volumeRef.current = volumes; mutedRef.current = mutedTracks; soundsRef.current = currentSounds; },
    [grid, volumes, mutedTracks, currentSounds]);

  //  Load session on mount 
  useEffect(() => {
    const s = loadSession();
    if (s.bpm) setBpm(s.bpm);
    const kIdx = s.kitIndex ?? 0;
    const loadedSteps = s.kits?.[kIdx]?.stepsCount || 16;
    if (setStepsCount) setStepsCount(loadedSteps);
    if (s.kits && setHasActiveBeat) { const k = s.kits[kIdx]; if (k.grid?.some(r => r?.some(Boolean))) setHasActiveBeat(true); }
    setTimeout(() => setIsLoaded(true), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist session 
  useEffect(() => {
    if (!isLoaded) return;
    try { localStorage.setItem("beatforge_seq_session", JSON.stringify({ bpm, kitIndex: currentKitIndex, kits })); }
    catch { try { const light = kits.map(k => ({ ...k, sounds: k.sounds.map(s => s.file?.length > 500 ? { ...s, file: null, name: s.name + " (Unsaved)" } : s) })); localStorage.setItem("beatforge_seq_session", JSON.stringify({ bpm, kitIndex: currentKitIndex, kits: light })); } catch {} }
  }, [bpm, currentKitIndex, kits, isLoaded]);

  // Reset when user changes 
  useEffect(() => {
    if (!isLoaded || currentUser?._id === prevUserRef.current?._id) { prevUserRef.current = currentUser; return; }
    setKits(initKits(DRUM_KITS, 16)); setCurrentKitIndex(0); setCurrentStep(0); lastStepRef.current = -1; setShowMixer(false);
    if (setHasActiveBeat) setHasActiveBeat(false);
    if (setStepsCount) setStepsCount(16);
    localStorage.removeItem("beatforge_seq_session"); prevUserRef.current = currentUser;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isLoaded]);

  // Preload audio
  useEffect(() => {
    if (!audioCtx) return;
    (async () => {
      for (const s of currentSounds) {
        if (!s.file || buffersRef.current[s.file]) continue;
        try {
          let buf;
          if (s.file.startsWith("data:audio")) { const bin = atob(s.file.split(",")[1]), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); buf = bytes.buffer; }
          else buf = await fetch(s.file).then(r => r.arrayBuffer());
          buffersRef.current[s.file] = await audioCtx.decodeAudioData(buf);
        } catch (e) { console.error("Audio decode failed:", s.file, e); }
      }
    })();
  }, [currentSounds]);

  // Stop audio when playback stops 
  useEffect(() => {
    if (!isCurrentlyPlaying) { activeNodes.current.forEach(n => { try { n.stop(); } catch {} }); activeNodes.current = []; }
  }, [isCurrentlyPlaying]);

  //  Sync deleted samples across all kits 
  useEffect(() => {
    if (!isLoaded) return;
    if (prevSamplesRef.current?.length === mySamples.length + 1) {
      const gone = prevSamplesRef.current.find(p => !mySamples.some(c => String(c.id) === String(p.id)));
      if (gone) setKits(prev => { const copy = [...prev]; let changed = false; copy.forEach((k, i) => { if (!k.sounds) return; const rm = k.sounds.reduce((a, s, j) => String(s.sourceId) === String(gone.id) ? [...a, j] : a, []); if (rm.length) { changed = true; copy[i] = { ...k, sounds: k.sounds.filter((_, j) => !rm.includes(j)), grid: k.grid.filter((_, j) => !rm.includes(j)), volumes: k.volumes.filter((_, j) => !rm.includes(j)), mutedTracks: k.mutedTracks.filter((_, j) => !rm.includes(j)) }; } }); return changed ? copy : prev; });
    }
    prevSamplesRef.current = mySamples;
  }, [mySamples, isLoaded]);

  // Playback scheduler 
  useEffect(() => {
    const numSteps = kitSteps;
    if (!isCurrentlyPlaying || !playbackStartTime) { clearTimeout(intervalRef.current); setCurrentStep(0); lastStepRef.current = -1; vStartRef.current = 0; return; }
    if (Date.now() - playbackStartTime > 500 && lastStepRef.current === -1) return;

    if (!vStartRef.current || lastStepRef.current === -1) { vStartRef.current = playbackStartTime; prevBpmRef.current = bpm; prevStepsRef.current = numSteps; }

    if (bpm !== prevBpmRef.current || numSteps !== prevStepsRef.current) {
      const oldMs = (60000 / prevBpmRef.current) / 4, elapsed = Date.now() - vStartRef.current, newMs = (60000 / bpm) / 4;
      const wrapped = Math.floor(elapsed / oldMs) % prevStepsRef.current % numSteps;
      vStartRef.current = Date.now() - (wrapped * newMs + ((elapsed % oldMs) / oldMs) * newMs);
      prevBpmRef.current = bpm; prevStepsRef.current = numSteps; lastStepRef.current = wrapped;
    }

    clearTimeout(intervalRef.current);
    const stepMs = (60000 / bpm) / 4;

    const playSound = (file, vol) => {
      const buf = buffersRef.current[file]; if (!buf || !audioCtx) return;
      if (audioCtx.state === "suspended") audioCtx.resume();
      const src = audioCtx.createBufferSource(), gain = audioCtx.createGain();
      src.buffer = buf; gain.gain.value = Number.isFinite(Number(vol)) ? Number(vol) : 1;
      src.connect(gain); gain.connect(masterGain); src.start(0); activeNodes.current.push(src);
      src.onended = () => { activeNodes.current = activeNodes.current.filter(n => n !== src); };
    };

    const tick = () => {
      const abs = Math.floor((Date.now() - vStartRef.current) / stepMs), step = abs % numSteps;
      if (step !== lastStepRef.current) {
        if (!isLocked) soundsRef.current.forEach((s, i) => { if (gridRef.current[i]?.[step] && !mutedRef.current[i]) playSound(s.file, volumeRef.current[i]); });
        setCurrentStep(step); lastStepRef.current = step;
      }
      intervalRef.current = setTimeout(tick, Math.max(0, vStartRef.current + (abs + 1) * stepMs - Date.now()));
    };
    tick(); return () => clearTimeout(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentlyPlaying, playbackStartTime, bpm, kitSteps, currentKitIndex, isLocked]);

  // Close context menu on outside click
  useEffect(() => { const close = () => setContextMenu(p => ({ ...p, visible: false })); document.addEventListener("click", close); return () => document.removeEventListener("click", close); }, []);

  // Presets 
  useEffect(() => {
    if (!currentUser) { setPresets([]); return; }
    const token = localStorage.getItem("beatforge_token");
    fetch("http://localhost:5000/api/presets", { headers: { "x-auth-token": token } }).then(r => r.ok ? r.json() : []).then(setPresets).catch(console.error);
  }, [currentUser]);

  const savePreset = async () => {
    if (isLocked) { setShowProModal(true); return; }
    if (!presetName.trim()) { flash(setPresetSaveStatus, "no_name"); return; }
    if (!currentUser)       { flash(setPresetSaveStatus, "no_user"); return; }
    try {
      const token = localStorage.getItem("beatforge_token");
      const res = await fetch("http://localhost:5000/api/presets", { method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": token }, body: JSON.stringify({ name: presetName, bpm, stepsCount: kitSteps, grid, volumes, mutedTracks, kitIndex: currentKitIndex, sounds: soundsRef.current }) });
      if (res.ok) { const saved = await res.json(); setPresets(p => [saved, ...p]); setPresetName(""); flash(setPresetSaveStatus, "saved"); } else flash(setPresetSaveStatus, "error");
    } catch { flash(setPresetSaveStatus, "error"); }
  };

  const loadPreset = (preset) => {
    if (!preset) return;
    setBpm(preset.bpm); 
    const n = Number(preset.stepsCount) || 16;
    if (setStepsCount) setStepsCount(n);
    const idx = preset.kitIndex ?? 0;
    setKits(prev => { const c = [...prev], k = { ...c[idx] }; if (preset.sounds?.length) k.sounds = preset.sounds; k.stepsCount = n; k.grid = preset.grid || k.sounds.map(() => Array(n).fill(false)); k.volumes = preset.volumes || k.sounds.map(() => 1); k.mutedTracks = preset.mutedTracks || k.sounds.map(() => false); c[idx] = k; return c; });
    setCurrentKitIndex(idx); if (setHasActiveBeat) setHasActiveBeat(true);
  };

  const confirmDeletePreset = async () => {
    if (!currentUser || presetToDeleteIndex === null) return;
    const preset = presets[presetToDeleteIndex]; if (!preset._id) return;
    try { const token = localStorage.getItem("beatforge_token"); const res = await fetch(`http://localhost:5000/api/presets/${preset._id}`, { method: "DELETE", headers: { "x-auth-token": token } }); if (res.ok) { setPresets(p => p.filter((_, i) => i !== presetToDeleteIndex)); document.querySelector(".led-select").value = ""; } } catch (e) { console.error(e); }
    setPresetToDeleteIndex(null);
  };

  // Grid actions 
  const updateStep = (row, step, value) => {
    if (isLocked) return; if (setHasActiveBeat) setHasActiveBeat(true);
    updateKit(k => { const g = k.grid.map(r => [...(r || [])]); if (!g[row]) g[row] = Array(k.stepsCount || 16).fill(false); g[row][step] = value; return { ...k, grid: g }; });
  };
  const clearBeat = () => { updateKit(k => ({ ...k, grid: k.grid.map(() => Array(k.stepsCount || 16).fill(false)) })); setCurrentStep(0); lastStepRef.current = -1; if (setHasActiveBeat) setHasActiveBeat(false); };
  const fillSteps = (row, interval, start) => { if (isLocked) return; updateKit(k => { const g = k.grid.map(r => [...(r||[])]); if (g[row]) g[row] = g[row].map((_, i) => i >= start && (i - start) % interval === 0); return { ...k, grid: g }; }); if (setHasActiveBeat) setHasActiveBeat(true); };
  const clearTrack = (row) => { if (isLocked) return; updateKit(k => { const g = k.grid.map(r => [...(r||[])]); if (g[row]) g[row] = g[row].map(() => false); return { ...k, grid: g }; }); };
  const deleteTrack = (row) => { if (currentSounds.length <= 1) return; updateKit(k => ({ ...k, sounds: k.sounds.filter((_, i) => i !== row), grid: k.grid.filter((_, i) => i !== row), volumes: k.volumes.filter((_, i) => i !== row), mutedTracks: k.mutedTracks.filter((_, i) => i !== row) })); };

  // File upload 
  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!["audio/wav","audio/mpeg","audio/mp3","audio/ogg","audio/x-wav"].includes(file.type) && ![".wav",".mp3",".ogg"].includes(ext)) { alert("⚠️ Invalid file format!\n\nPlease upload only .wav, .mp3, or .ogg files."); e.target.value = null; return; }
    const reader = new FileReader();
    reader.onloadend = () => addSound({ name: file.name.replace(/\.[^/.]+$/, "").substring(0, 10).toUpperCase(), file: reader.result });
    reader.readAsDataURL(file); e.target.value = null;
  };

  //  Live Pad 
  const drumCount = () => (projectPatterns || []).filter(p => p.type === "drum").length;
  const initiateSaveToLivePad = () => { if (isLocked) { setShowProModal(true); return; } if (!gridRef.current.some(r => r?.some(Boolean))) { flash(setSaveStatus, "empty"); return; } setLivePadName(`Drums ${drumCount() + 1}`); setShowLivePadModal(true); };
  const confirmSaveToLivePad = () => {
    const name = livePadName.trim() || `Drums ${drumCount() + 1}`;
    const pattern = { id: `drum-${Date.now()}`, type: "drum", name, stepsCount: kitSteps, data: { grid: gridRef.current.map(r => [...(r||[])]), volumes: [...volumeRef.current], kitIndex: currentKitIndex, sounds: soundsRef.current } };
    if (setProjectPatterns) { setProjectPatterns(p => [...(p || []), pattern]); flash(setSaveStatus, "saved"); } setShowLivePadModal(false);
  };

  //  Preset button style 
  const PRESET_LABEL = { idle: "Save", no_name: "⚠️ NAME", no_user: "⚠️ LOGIN", saved: "✔️ SAVED", error: "⚠️ ERROR" };
  const presetBtnStyle = { background: ["no_name","no_user","error"].includes(presetSaveStatus) ? "#ff4757" : presetSaveStatus === "saved" ? "#00e676" : "transparent", color: presetSaveStatus !== "idle" ? (presetSaveStatus === "saved" ? "#000" : "#fff") : "var(--text-light)", border: presetSaveStatus !== "idle" ? "none" : "1px solid var(--border-dark)", minWidth: 85, justifyContent: "center", fontWeight: presetSaveStatus !== "idle" ? "bold" : "normal", transition: "all 0.2s" };

  return (
    <>
      {showLivePadModal && (
        <Modal>
          <div style={{ fontSize: 45, marginBottom: 10 }}>🎛️</div>
          <h3 style={{ margin: "0 0 12px", color: "#fff", fontSize: 20, letterSpacing: 1 }}>NAME YOUR LOOP</h3>
          <input autoFocus type="text" value={livePadName} onChange={e => setLivePadName(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmSaveToLivePad()} className="led-input" style={{ width: "100%", marginBottom: 20, boxSizing: "border-box", textAlign: "center", fontSize: 16, padding: 10 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="panel-btn" onClick={() => setShowLivePadModal(false)} style={{ flex: 1, background: "#222", color: "#fff", cursor: "pointer" }}>CANCEL</button>
            <button className="panel-btn action-btn" onClick={confirmSaveToLivePad} style={{ flex: 1, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontWeight: "bold" }}>SAVE TO PAD</button>
          </div>
        </Modal>
      )}

      {showProModal && (
        <Modal>
          <div style={{ fontSize: 45, marginBottom: 10 }}>👑</div>
          <h3 style={{ margin: "0 0 12px", color: "#FFD700", fontSize: 22, letterSpacing: 1 }}>PRO FEATURE</h3>
          <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>This feature is exclusive to Beatforge Pro.<br /><br />Click the <strong style={{ color: "#FFD700" }}>⭐ UNLOCK PRO</strong> button in the top bar to get lifetime access!</p>
          <button className="panel-btn" onClick={() => setShowProModal(false)} style={{ width: "100%", background: "#222", color: "#fff", cursor: "pointer" }}>GOT IT</button>
        </Modal>
      )}

      {presetToDeleteIndex !== null && presets[presetToDeleteIndex] && (
        <Modal>
          <div style={{ fontSize: 45, marginBottom: 10 }}>⚠️</div>
          <h3 style={{ margin: "0 0 12px", color: "#ff4757", fontSize: 22, letterSpacing: 1 }}>DELETE PRESET?</h3>
          <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>Are you sure you want to permanently delete <br /><strong style={{ color: "#fff" }}>"{presets[presetToDeleteIndex].name}"</strong>?</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="panel-btn" onClick={() => setPresetToDeleteIndex(null)} style={{ flex: 1, background: "#222", color: "#fff", cursor: "pointer" }}>CANCEL</button>
            <button className="panel-btn" onClick={confirmDeletePreset} style={{ flex: 1, background: "#ff4757", color: "#fff", border: "none", cursor: "pointer", fontWeight: "bold" }}>DELETE</button>
          </div>
        </Modal>
      )}

      <div className="sequencer" onContextMenu={e => e.preventDefault()}>

        <div className="preset-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>

          <div className="sequencer-header">
            <div className="header-icon">{Icon.grid}</div>
            <h2 className="workspace-title">Step Sequencer</h2>
            <div className="status-dot" />
          </div>

          <div className="hardware-panel">
            <div className="panel-label">SOUNDBANK</div>
            <div className="panel-controls">
              <button className="panel-btn" onClick={() => handleKitChange(-1)}>{Icon.prev}</button>
              <div className="led-input" style={{ width: 150, textAlign: "center", userSelect: "none", color: "#00e676", textShadow: "0 0 5px rgba(0,230,118,0.5)" }}>{currentKit.name} {currentKit.proOnly && "👑"}</div>
              <button className="panel-btn" onClick={() => handleKitChange(1)}>{Icon.next}</button>
            </div>
          </div>

          <div className="hardware-panel">
            <div className="panel-label">PRESET LIBRARY</div>
            <div className="panel-controls">
              <input type="text" placeholder="NAME..." value={presetName} onChange={e => setPresetName(e.target.value)} className="led-input" style={{ width: 110 }} />
              <button onClick={savePreset} className="panel-btn action-btn" style={presetBtnStyle}>
                {presetSaveStatus === "idle" && <span style={{ marginRight: 6 }}>{Icon.save}</span>}
                {PRESET_LABEL[presetSaveStatus]}
              </button>
              <div className="panel-divider" />
              <select className="led-select" onChange={e => { if (e.target.value !== "") loadPreset(presets[e.target.value]); }}>
                <option value="">Load preset...</option>
                {presets.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
              </select>
              <button className="panel-btn danger-icon-btn" title="Delete Preset" onClick={() => { const v = document.querySelector(".led-select")?.value; if (v) setPresetToDeleteIndex(Number(v)); }}>{Icon.trash}</button>
            </div>
          </div>

          <div className="hardware-panel">
            <div className="panel-label">TOOLS</div>
            <div className="panel-controls grid-tools-group">
              <Knob label="STEPS" value={kitSteps} min={8} max={32} step={1} onChange={handleStepsChange} />
              <div className="panel-divider" />
              <div className="trigger-pad-wrapper">
                <div className="knob-label" style={{ color: "#ff4757" }}>CLEAR</div>
                <button onClick={clearBeat} className="trigger-pad">{Icon.clear}</button>
                <div className="pad-spacer" />
              </div>
              <div className="panel-divider" />
              <button className="panel-btn action-btn" onClick={() => setShowMixer(v => !v)} style={{ background: showMixer ? "var(--accent)" : "transparent", color: showMixer ? "#fff" : "var(--text-light)" }}>
                <span style={{ marginRight: 6 }}>{Icon.mixer}</span>MIXER
              </button>
              <button onClick={initiateSaveToLivePad} className="panel-btn action-btn" style={{ fontWeight: "bold", background: saveStatus === "empty" ? "#ff4757" : saveStatus === "saved" ? "#00e676" : "var(--accent)", color: "#fff", border: "none", marginLeft: 10, transition: "all 0.2s", width: 130, justifyContent: "center" }}>
                {saveStatus === "empty" ? "⚠️ EMPTY" : saveStatus === "saved" ? "✔️ SAVED" : "💾 TO LIVE PAD"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: isLocked ? 250 : "auto" }}>
          {isLocked && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid rgba(255,215,0,0.2)" }}>
              <div style={{ fontSize: 45, marginBottom: 10, textShadow: "0 0 20px rgba(255,215,0,0.5)" }}>🔒</div>
              <h3 style={{ color: "#FFD700", margin: "0 0 10px", letterSpacing: 2, fontSize: 20 }}>PRO SOUNDBANK</h3>
              <p style={{ color: "#ddd", margin: 0, fontSize: 14 }}>The <strong>{currentKit.name}</strong> kit is exclusive to Pro users.</p>
              <p style={{ color: "#888", fontSize: 13, marginTop: 12 }}>Click <strong style={{ color: "#FFD700" }}>⭐ UNLOCK PRO</strong> in the top bar to access.</p>
            </div>
          )}

          {!showMixer ? (
            <div className="grid-view-container">
              {currentSounds.map((sound, rowIndex) => {
                const name = sound?.name ? String(sound.name) : "Track";
                const display = name.length > 10 ? name.substring(0, 8) + ".." : name;
                return (
                  <div key={`${name}-${rowIndex}`} className={`sequencer-row ${mutedTracks[rowIndex] ? "muted" : ""}`}>
                    <div className="track-label">
                      <span className="track-name" title={name}>{display}</span>
                      <div className="track-controls">
                        <button className="track-options-btn" onClick={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, rowIndex, startStep: 0 }); }}>{Icon.dots}</button>
                      </div>
                    </div>
                    <div className="steps" onMouseUp={() => (dragMode.current = null)} onMouseLeave={() => (dragMode.current = null)}>
                      {(grid[rowIndex] || Array(kitSteps).fill(false)).map((active, stepIndex) => (
                        <div key={stepIndex}
                          className={`step ${active ? "active" : ""} ${currentStep === stepIndex ? "current" : ""} ${Math.floor(stepIndex / 4) % 2 === 1 ? "alt-group" : ""}`}
                          onMouseDown={e  => { isDraggingRef.current = false; dragMode.current = e.button === 2 ? "erase" : "paint"; updateStep(rowIndex, stepIndex, e.button !== 2); }}
                          onMouseEnter={() => { if (dragMode.current) { isDraggingRef.current = true; updateStep(rowIndex, stepIndex, dragMode.current === "paint"); } }}
                          onContextMenu={e => e.preventDefault()}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Mixer currentSounds={currentSounds} volumes={volumes} setVolumes={v => updateKit(k => ({ ...k, volumes: typeof v === "function" ? v(k.volumes) : v }))} mutedTracks={mutedTracks} setMutedTracks={m => updateKit(k => ({ ...k, mutedTracks: typeof m === "function" ? m(k.mutedTracks) : m }))} />
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <input type="file" accept=".wav,.mp3,.ogg,audio/wav,audio/mpeg,audio/ogg" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
          <button className="panel-btn" onClick={() => currentUser?.isPro ? fileInputRef.current.click() : setShowProModal(true)} style={{ flex: 1, padding: 12, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.2)", justifyContent: "center", letterSpacing: 2, color: "var(--text-muted)" }}>
            {Icon.plus} UPLOAD SAMPLE {currentUser?.isPro ? "" : "👑"}
          </button>
          <select className="panel-btn" style={{ flex: 1, padding: 12, background: "transparent", border: "1px dashed rgba(166,74,255,0.4)", color: "var(--accent)", cursor: "pointer", outline: "none", letterSpacing: 2, textAlign: "center", appearance: "none" }}
            onChange={e => { const s = mySamples.find(m => String(m.id) === e.target.value); if (s) addSound({ name: s.name.substring(0, 10).toUpperCase(), file: s.file, sourceId: String(s.id) }); e.target.value = ""; }}>
            <option value="" style={{ background: "#0f0f13", color: "#fff" }}>+ FROM BROWSER...</option>
            {mySamples.map(s => <option key={s.id} value={s.id} style={{ background: "#0f0f13", color: "#fff" }}>{s.name}</option>)}
          </select>
        </div>

        {contextMenu.visible && (
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
            {[2, 4, 8].map(n => <div key={n} className="context-item" onClick={() => { fillSteps(contextMenu.rowIndex, n, contextMenu.startStep); setContextMenu(c => ({ ...c, visible: false })); }}>Fill every {n} steps</div>)}
            <div className="context-divider" />
            <div className="context-item" onClick={() => { clearTrack(contextMenu.rowIndex); setContextMenu(c => ({ ...c, visible: false })); }}>Clear track</div>
            <div className="context-divider" />
            <div className="context-item danger" onClick={() => { deleteTrack(contextMenu.rowIndex); setContextMenu(c => ({ ...c, visible: false })); }}>Delete track</div>
          </div>
        )}

      </div>
    </>
  );
}