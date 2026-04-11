import React, { useState, useRef, useEffect, useMemo } from "react";
import Knob from "./common/Knob";
import Mixer from "./Mixer"; 
import { audioCtx, masterGain } from "../utils/audioEngine"; 
import "../styles/sequencer.css";

const initialDrumKits = [
  { name: "MODERN 808", sounds: [{ name: "808 Kick", file: "/sounds/kick.wav" }, { name: "808 Snare", file: "/sounds/snare.wav" }, { name: "808 Hat", file: "/sounds/hihat.wav" }] },
  { name: "ACOUSTIC", sounds: [{ name: "Acoustic Kick", file: "/sounds/kick-acoustic.wav" }, { name: "Acoustic Snare", file: "/sounds/snare-acoustic.wav" }, { name: "Acoustic Hat", file: "/sounds/hihat-acoustic.wav" }] },
  { name: "SYNTHWAVE", sounds: [{ name: "Retro Kick", file: "/sounds/kick-retro.wav" }, { name: "Retro Snare", file: "/sounds/snare-retro.wav" }, { name: "Retro Hat", file: "/sounds/hihat-retro.wav" }] },
  { name: "LO-FI CHILL", sounds: [{ name: "Lofi Kick", file: "/sounds/kick-lofi.wav" }, { name: "Lofi Snare", file: "/sounds/snare-lofi.wav" }, { name: "Lofi Hat", file: "/sounds/hihat-lofi.wav" }] },
  { name: "TECHNO HOUSE", proOnly: true, sounds: [{ name: "Punch Kick", file: "/sounds/kick-techno.wav" }, { name: "Clap Snare", file: "/sounds/snare-techno.wav" }, { name: "Open Hat", file: "/sounds/hihat-techno.wav" }] },
  { name: "DUBSTEP GRIME", proOnly: true, sounds: [{ name: "Heavy Kick", file: "/sounds/kick-dubstep.wav" }, { name: "Slap Snare", file: "/sounds/snare-dubstep.wav" }, { name: "Crisp Hat", file: "/sounds/hihat-dubstep.wav" }] },
  { name: "USER KIT", proOnly: true, sounds: [{ name: "Custom Kick", file: "/sounds/kick.wav" }] }
];

export default function StepSequencer({ 
  isPlaying, activeStudioView, playbackStartTime, bpm, setBpm, masterVolume, 
  currentUser, setHasActiveBeat, stepsCount, setStepsCount, mySamples, projectPatterns, setProjectPatterns 
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  const [kits, setKits] = useState(() => {
    try {
      const saved = localStorage.getItem("beatforge_seq_session");
      if (saved) return JSON.parse(saved).kits || initialDrumKits;
    } catch(e) {}
    return initialDrumKits;
  });

  const [currentKitIndex, setCurrentKitIndex] = useState(() => {
    try {
      const saved = localStorage.getItem("beatforge_seq_session");
      if (saved && JSON.parse(saved).kitIndex !== undefined) return JSON.parse(saved).kitIndex;
    } catch(e) {}
    return 0;
  });

  const currentSounds = useMemo(() => kits[currentKitIndex]?.sounds || [], [kits, currentKitIndex]);

  const [grid, setGrid] = useState(() => {
    try {
      const saved = localStorage.getItem("beatforge_seq_session");
      if (saved && JSON.parse(saved).grid) return JSON.parse(saved).grid;
    } catch(e) {}
    return currentSounds.map(() => Array(16).fill(false));
  });

  const [volumes, setVolumes] = useState(() => {
    try {
      const saved = localStorage.getItem("beatforge_seq_session");
      if (saved && JSON.parse(saved).volumes) return JSON.parse(saved).volumes;
    } catch(e) {}
    return currentSounds.map(() => 1);
  });

  const [mutedTracks, setMutedTracks] = useState(() => {
    try {
      const saved = localStorage.getItem("beatforge_seq_session");
      if (saved && JSON.parse(saved).mutedTracks) return JSON.parse(saved).mutedTracks;
    } catch(e) {}
    return currentSounds.map(() => false);
  });

  const isLocked = kits[currentKitIndex]?.proOnly && !currentUser?.isPro;
  const [showProModal, setShowProModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [presetSaveStatus, setPresetSaveStatus] = useState("idle");
  const [presetToDeleteIndex, setPresetToDeleteIndex] = useState(null);
  const [showLivePadModal, setShowLivePadModal] = useState(false);
  const [livePadName, setLivePadName] = useState("");
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
  const mutedTracksRef = useRef(mutedTracks);
  const currentSoundsRef = useRef(currentSounds);
  const lastPlayedStepRef = useRef(-1);

  const activeAudioNodesRef = useRef([]);

  const prevBpmRef = useRef(bpm);
  const prevStepsCountRef = useRef(stepsCount);
  const virtualStartTimeRef = useRef(0);
  const audioBuffersRef = useRef({}); 
  const prevUserRef = useRef(currentUser);
  const prevMySamplesRef = useRef(mySamples);

  const isCurrentlyPlaying = isPlaying && (activeStudioView === "sequencer" || activeStudioView === "beatmaker");

  useEffect(() => {
    if (!isLoaded) return;

    if (prevMySamplesRef.current && prevMySamplesRef.current.length === mySamples.length + 1) {
      const deletedSampleId = prevMySamplesRef.current.find(prevS => !mySamples.some(currS => String(currS.id) === String(prevS.id)))?.id;

      if (deletedSampleId) {
        setKits(prev => {
          const copy = [...prev];
          const currentKit = copy[currentKitIndex];
          if (currentKit && currentKit.sounds) {
            const indicesToRemove = [];
            currentKit.sounds.forEach((sound, index) => {
              if (String(sound.sourceId) === String(deletedSampleId)) indicesToRemove.push(index);
            });
            
            if (indicesToRemove.length > 0) {
              copy[currentKitIndex] = { ...currentKit, sounds: currentKit.sounds.filter((_, i) => !indicesToRemove.includes(i)) };
              setGrid(g => g.filter((_, i) => !indicesToRemove.includes(i)));
              setVolumes(v => v.filter((_, i) => !indicesToRemove.includes(i)));
              setMutedTracks(m => m.filter((_, i) => !indicesToRemove.includes(i)));
            }
          }
          return copy;
        });
      }
    }
    prevMySamplesRef.current = mySamples;
  }, [mySamples, isLoaded, currentKitIndex]);

  useEffect(() => {
    if (!isCurrentlyPlaying) {
      activeAudioNodesRef.current.forEach(node => {
        try { node.stop(); } catch (e) {}
      });
      activeAudioNodesRef.current = [];
    }
  }, [isCurrentlyPlaying]);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { volumeRef.current = volumes; }, [volumes]);
  useEffect(() => { mutedTracksRef.current = mutedTracks; }, [mutedTracks]);
  useEffect(() => { currentSoundsRef.current = currentSounds; }, [currentSounds]);

  useEffect(() => {
    const saved = localStorage.getItem("beatforge_seq_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.bpm) setBpm(parsed.bpm);
        if (parsed.stepsCount) setStepsCount(parsed.stepsCount);
        if (parsed.grid && setHasActiveBeat) {
          const hasNotes = parsed.grid.some(row => row && row.some(step => step === true));
          if (hasNotes) setHasActiveBeat(true);
        }
      } catch(e) {}
    }
    setTimeout(() => setIsLoaded(true), 50); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      const session = { bpm, stepsCount: Number(stepsCount), kitIndex: currentKitIndex, grid, volumes, mutedTracks, kits };
      localStorage.setItem("beatforge_seq_session", JSON.stringify(session));
    } catch (error) {
      try {
        const lightweightKits = kits.map(kit => ({
          ...kit,
          sounds: kit.sounds.map(sound => {
            if (sound.file && sound.file.length > 500) {
              return { ...sound, file: null, name: sound.name + " (Unsaved)" };
            }
            return sound;
          })
        }));
        const lightweightSession = { bpm, stepsCount: Number(stepsCount), kitIndex: currentKitIndex, grid, volumes, mutedTracks, kits: lightweightKits };
        localStorage.setItem("beatforge_seq_session", JSON.stringify(lightweightSession));
      } catch (fallbackError) {}
    }
  }, [bpm, stepsCount, currentKitIndex, grid, volumes, mutedTracks, kits, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (currentUser?._id !== prevUserRef.current?._id) {
      const numericSteps = Number(stepsCount);
      setGrid(currentSoundsRef.current.map(() => Array(numericSteps).fill(false)));
      setVolumes(currentSoundsRef.current.map(() => 1));
      setMutedTracks(currentSoundsRef.current.map(() => false));
      setCurrentKitIndex(0);
      setCurrentStep(0);
      lastPlayedStepRef.current = -1;
      setShowMixer(false);
      if (setHasActiveBeat) setHasActiveBeat(false);
      localStorage.removeItem("beatforge_seq_session"); 
    }
    prevUserRef.current = currentUser;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const numericSteps = Number(stepsCount);
    setGrid(prevGrid => (prevGrid || []).map(row => {
      const safeRow = row || [];
      if (safeRow.length < numericSteps) return [...safeRow, ...Array(numericSteps - safeRow.length).fill(false)];
      if (safeRow.length > numericSteps) return safeRow.slice(0, numericSteps);
      return safeRow;
    }));
  }, [stepsCount, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const numericSteps = Number(stepsCount);
    const targetLength = kits[currentKitIndex]?.sounds?.length || 0;
    
    setGrid(prev => {
      if (prev.length === targetLength) return prev; 
      const newGrid = [...(prev || [])];
      while (newGrid.length < targetLength) newGrid.push(Array(numericSteps).fill(false));
      if (newGrid.length > targetLength) return newGrid.slice(0, targetLength);
      return newGrid; 
    });
    
    setVolumes(prev => {
      if (prev.length === targetLength) return prev;
      const newVols = [...(prev || [])];
      while (newVols.length < targetLength) newVols.push(1);
      if (newVols.length > targetLength) return newVols.slice(0, targetLength);
      return newVols; 
    });
    
    setMutedTracks(prev => {
      if (prev.length === targetLength) return prev;
      const newMutes = [...(prev || [])];
      while (newMutes.length < targetLength) newMutes.push(false);
      if (newMutes.length > targetLength) return newMutes.slice(0, targetLength);
      return newMutes; 
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKitIndex, stepsCount, isLoaded, kits]);

  useEffect(() => {
    const preloadAudioBuffers = async () => {
      if (!audioCtx) return;
      for (let sound of currentSounds) {
        if (!sound.file || !audioBuffersRef.current[sound.file]) {
          try {
            if (!sound.file) continue; 
            let arrayBuffer;
            if (sound.file.startsWith('data:audio')) {
               const base64Data = sound.file.split(',')[1];
               const binaryString = window.atob(base64Data);
               const len = binaryString.length;
               const bytes = new Uint8Array(len);
               for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
               }
               arrayBuffer = bytes.buffer;
            } else {
               const response = await fetch(sound.file);
               arrayBuffer = await response.arrayBuffer();
            }
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            audioBuffersRef.current[sound.file] = audioBuffer;
          } catch (e) { console.error(`Failed to decode: ${sound.file}`, e); }
        }
      }
    };
    preloadAudioBuffers();
  }, [currentSounds]); 

  const playDrumSample = (fileUrl, trackVolume) => {
    if (!fileUrl) return; 
    const buffer = audioBuffersRef.current[fileUrl];
    if (!buffer || !audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = buffer;
    const gainNode = audioCtx.createGain();
    
    const safeVolume = Number.isFinite(Number(trackVolume)) ? Number(trackVolume) : 1;
    gainNode.gain.value = safeVolume; 
    
    sourceNode.connect(gainNode);
    gainNode.connect(masterGain); 
    
    sourceNode.start(0);
    activeAudioNodesRef.current.push(sourceNode);
    sourceNode.onended = () => {
      activeAudioNodesRef.current = activeAudioNodesRef.current.filter(n => n !== sourceNode);
    };
  };

  useEffect(() => {
    const numericSteps = Number(stepsCount);

    if (!isCurrentlyPlaying || !playbackStartTime) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
      setCurrentStep(0);
      lastPlayedStepRef.current = -1;
      virtualStartTimeRef.current = 0; 
      return;
    }

    if (Date.now() - playbackStartTime > 500 && lastPlayedStepRef.current === -1) return;

    if (!virtualStartTimeRef.current || lastPlayedStepRef.current === -1) {
      virtualStartTimeRef.current = playbackStartTime;
      prevBpmRef.current = bpm;
      prevStepsCountRef.current = numericSteps;
    }

    if (bpm !== prevBpmRef.current || numericSteps !== prevStepsCountRef.current) {
      const oldStepDurationMs = (60000 / prevBpmRef.current) / 4;
      const elapsedOld = Date.now() - virtualStartTimeRef.current;
      const absoluteOldStep = Math.floor(elapsedOld / oldStepDurationMs);
      const currentOldGridStep = absoluteOldStep % prevStepsCountRef.current;
      const remainderMs = elapsedOld % oldStepDurationMs;
      
      const newStepDurationMs = (60000 / bpm) / 4;
      const wrappedNewStep = currentOldGridStep % numericSteps; 
      
      const equivalentElapsedNew = (wrappedNewStep * newStepDurationMs) + ((remainderMs / oldStepDurationMs) * newStepDurationMs);
      virtualStartTimeRef.current = Date.now() - equivalentElapsedNew;
      
      prevBpmRef.current = bpm;
      prevStepsCountRef.current = numericSteps;
      lastPlayedStepRef.current = wrappedNewStep; 
    }

    clearTimeout(intervalRef.current);
    const stepDurationMs = (60000 / bpm) / 4; 

    const scheduleNextStep = () => {
      const elapsedMs = Date.now() - virtualStartTimeRef.current;
      const absoluteStep = Math.floor(elapsedMs / stepDurationMs);
      const currentGridStep = absoluteStep % numericSteps;

      if (currentGridStep !== lastPlayedStepRef.current) {
        if (!isLocked) {
          currentSoundsRef.current.forEach((sound, rowIndex) => {
            if (gridRef.current[rowIndex] && gridRef.current[rowIndex][currentGridStep] && !mutedTracksRef.current[rowIndex]) {
              playDrumSample(sound.file, volumeRef.current[rowIndex]);
            }
          });
        }
        setCurrentStep(currentGridStep);
        lastPlayedStepRef.current = currentGridStep;
      }

      const nextAbsoluteStep = absoluteStep + 1;
      const timeOfNextStep = virtualStartTimeRef.current + (nextAbsoluteStep * stepDurationMs);
      const timeUntilNext = Math.max(0, timeOfNextStep - Date.now());
      intervalRef.current = setTimeout(scheduleNextStep, timeUntilNext);
    };

    scheduleNextStep();
    return () => clearTimeout(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentlyPlaying, playbackStartTime, bpm, stepsCount, currentKitIndex, isLocked]); 

  const updateStep = (row, step, value) => {
    if (isLocked) return; 
    if (setHasActiveBeat) setHasActiveBeat(true); 
    setGrid(prev => {
      const copy = prev.map(r => [...(r || [])]);
      if (!copy[row]) copy[row] = Array(Number(stepsCount)).fill(false);
      copy[row][step] = value;
      return copy;
    });
  };

  const clearBeat = () => {
    const numericSteps = Number(stepsCount);
    setGrid(currentSounds.map(() => Array(numericSteps).fill(false)));
    setCurrentStep(0);
    lastPlayedStepRef.current = -1;
    if (setHasActiveBeat) setHasActiveBeat(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 🌟 NEW: Strict File Validation Bouncer
    // Protects against .m4a, .flac, .pdf, images, etc.
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/x-wav'];
    const validExtensions = ['.wav', '.mp3', '.ogg'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      alert("⚠️ Invalid file format!\n\nPlease upload only .wav, .mp3, or .ogg files.");
      e.target.value = null; // Clear the input
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result; 
      const cleanName = file.name.replace(/\.[^/.]+$/, "").substring(0, 10).toUpperCase();
      const newSound = { name: cleanName, file: base64Audio };

      setKits(prev => {
        const copy = [...prev];
        copy[currentKitIndex] = { ...copy[currentKitIndex], sounds: [...copy[currentKitIndex].sounds, newSound] };
        return copy;
      }); 
      setGrid(prev => [...prev, Array(Number(stepsCount)).fill(false)]);
      setVolumes(prev => [...prev, 1]);
      setMutedTracks(prev => [...prev, false]);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const addTrackFromBrowser = (sample) => {
    if (!sample) return;
    const newSound = { 
      name: sample.name.substring(0, 10).toUpperCase(), 
      file: sample.file, 
      sourceId: String(sample.id) 
    };
    setKits(prev => {
      const copy = [...prev];
      copy[currentKitIndex] = { ...copy[currentKitIndex], sounds: [...copy[currentKitIndex].sounds, newSound] };
      return copy;
    });
    setGrid(prev => [...prev, Array(Number(stepsCount)).fill(false)]); 
    setVolumes(prev => [...prev, 1]);
    setMutedTracks(prev => [...prev, false]);
  };

  const deleteTrack = (rowIndex) => {
    if (currentSounds.length <= 1) return;
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
    if (!currentUser) { setPresets([]); return; }
    const fetchCloudPresets = async () => {
      try {
        const token = localStorage.getItem("beatforge_token");
        const res = await fetch("http://localhost:5000/api/presets", { headers: { "x-auth-token": token } });
        if (res.ok) { const data = await res.json(); setPresets(data); }
      } catch (error) { console.error("Failed to load cloud presets:", error); }
    };
    fetchCloudPresets();
  }, [currentUser]);

  const savePreset = async () => {
    if (isLocked) { setShowProModal(true); return; }
    if (!presetName.trim()) { setPresetSaveStatus("no_name"); setTimeout(() => setPresetSaveStatus("idle"), 2000); return; }
    if (!currentUser) { setPresetSaveStatus("no_user"); setTimeout(() => setPresetSaveStatus("idle"), 2000); return; }
    
    const presetData = { 
      name: presetName, bpm, stepsCount: Number(stepsCount), grid, volumes, mutedTracks, kitIndex: currentKitIndex, sounds: currentSoundsRef.current 
    };
    
    try {
      const token = localStorage.getItem("beatforge_token");
      const res = await fetch("http://localhost:5000/api/presets", {
        method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": token }, body: JSON.stringify(presetData)
      });
      if (res.ok) {
        const savedPreset = await res.json();
        setPresets(prev => [savedPreset, ...prev]);
        setPresetName("");
        setPresetSaveStatus("saved");
        setTimeout(() => setPresetSaveStatus("idle"), 2000);
      } else {
        setPresetSaveStatus("error");
        setTimeout(() => setPresetSaveStatus("idle"), 2000);
      }
    } catch (error) { 
      console.error("Failed to save preset to cloud:", error); 
      setPresetSaveStatus("error");
      setTimeout(() => setPresetSaveStatus("idle"), 2000);
    }
  };

  const loadPreset = (preset) => {
    if (!preset) return;
    setBpm(preset.bpm); 
    setStepsCount(Number(preset.stepsCount) || 16); 

    let targetIndex = preset.kitIndex !== undefined ? preset.kitIndex : 0;

    if (preset.sounds && preset.sounds.length > 0) {
      setKits(prev => {
        const copy = [...prev];
        copy[targetIndex] = { ...copy[targetIndex], sounds: preset.sounds };
        return copy;
      });
    }

    setCurrentKitIndex(targetIndex);
    setGrid(preset.grid || []);
    setVolumes(preset.volumes || []);
    setMutedTracks(preset.mutedTracks || (preset.grid ? preset.grid.map(() => false) : []));

    if (setHasActiveBeat) setHasActiveBeat(true); 
  };

  const initiateDeletePreset = () => {
    const selectEl = document.querySelector(".led-select");
    if (selectEl && selectEl.value !== "") {
      setPresetToDeleteIndex(Number(selectEl.value));
    }
  };

  const confirmDeletePreset = async () => {
    if (!currentUser || presetToDeleteIndex === null) return;
    const presetToDelete = presets[presetToDeleteIndex];
    if (!presetToDelete._id) return; 

    try {
      const token = localStorage.getItem("beatforge_token");
      const res = await fetch(`http://localhost:5000/api/presets/${presetToDelete._id}`, { method: "DELETE", headers: { "x-auth-token": token } });
      if (res.ok) { 
        setPresets(prev => prev.filter((_, i) => i !== presetToDeleteIndex)); 
        const selectEl = document.querySelector(".led-select");
        if (selectEl) selectEl.value = "";
      }
    } catch (error) { console.error("Failed to delete preset from cloud:", error); }
    
    setPresetToDeleteIndex(null); 
  };

  const fillSteps = (rowIndex, interval, startStep) => {
    if (isLocked) return;
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
    if (isLocked) return;
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

  const initiateSaveToLivePad = () => {
    if (isLocked) { setShowProModal(true); return; }
    
    const hasNotes = gridRef.current.some(row => row && row.some(step => step === true));
    if (!hasNotes) { 
      setSaveStatus("empty");
      setTimeout(() => setSaveStatus("idle"), 2000);
      return; 
    }
    
    const patternCount = (projectPatterns || []).filter(p => p.type === 'drum').length + 1;
    setLivePadName(`Drums ${patternCount}`); 
    setShowLivePadModal(true);
  };

  const confirmSaveToLivePad = () => {
    const finalName = livePadName.trim() || `Drums ${(projectPatterns || []).filter(p => p.type === 'drum').length + 1}`;

    const newPattern = {
      id: `drum-${Date.now()}`, 
      type: 'drum', 
      name: finalName, 
      stepsCount: Number(stepsCount),
      data: { grid: [...gridRef.current.map(row => [...(row || [])])], volumes: [...volumeRef.current], kitIndex: currentKitIndex, sounds: currentSoundsRef.current }
    };

    if (setProjectPatterns) {
      setProjectPatterns(prev => [...(prev || []), newPattern]);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
    setShowLivePadModal(false);
  };

  return (
    <>
      {showLivePadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #333', textAlign: 'center', maxWidth: '350px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: '45px', marginBottom: '10px' }}>🎛️</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '20px', letterSpacing: '1px' }}>NAME YOUR LOOP</h3>
            
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

      {showProModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #333', textAlign: 'center', maxWidth: '350px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: '45px', marginBottom: '10px' }}>👑</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#FFD700', fontSize: '22px', letterSpacing: '1px' }}>PRO FEATURE</h3>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
              This feature is exclusive to Beatforge Pro.<br/><br/>
              Click the <strong style={{color: '#FFD700'}}>⭐ UNLOCK PRO</strong> button in the top bar to get lifetime access!
            </p>
            <button className="panel-btn" onClick={() => setShowProModal(false)} style={{ width: '100%', background: '#222', color: '#fff', cursor: 'pointer' }}>GOT IT</button>
          </div>
        </div>
      )}

      {presetToDeleteIndex !== null && presets[presetToDeleteIndex] && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #333', textAlign: 'center', maxWidth: '350px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: '45px', marginBottom: '10px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#ff4757', fontSize: '22px', letterSpacing: '1px' }}>DELETE PRESET?</h3>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to permanently delete the preset <br/>
              <strong style={{color: '#fff'}}>"{presets[presetToDeleteIndex].name}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="panel-btn" onClick={() => setPresetToDeleteIndex(null)} style={{ flex: 1, background: '#222', color: '#fff', cursor: 'pointer' }}>CANCEL</button>
              <button className="panel-btn" onClick={confirmDeletePreset} style={{ flex: 1, background: '#ff4757', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>DELETE</button>
            </div>
          </div>
        </div>
      )}

      <div className="sequencer" onContextMenu={(e) => e.preventDefault()}>
        <div className="preset-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="sequencer-header">
            <div className="header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </div>
            <h2 className="workspace-title">Step Sequencer</h2>
            <div className="status-dot"></div>
          </div>
        
          <div className="hardware-panel">
            <div className="panel-label">SOUNDBANK</div>
            <div className="panel-controls">
              <button className="panel-btn" onClick={() => setCurrentKitIndex((prev) => prev === 0 ? kits.length - 1 : prev - 1)} title="Previous Kit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div className="led-input" style={{ width: '150px', textAlign: 'center', userSelect: 'none', color: '#00e676', textShadow: '0 0 5px rgba(0, 230, 118, 0.5)' }}>
                {kits[currentKitIndex].name} {kits[currentKitIndex].proOnly && "👑"}
              </div>
              <button className="panel-btn" onClick={() => setCurrentKitIndex((prev) => (prev + 1) % kits.length)} title="Next Kit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>

          <div className="hardware-panel">
            <div className="panel-label">PRESET LIBRARY</div>
            <div className="panel-controls">
              <input type="text" placeholder="NAME..." value={presetName} onChange={(e) => setPresetName(e.target.value)} className="led-input" style={{ width: '110px' }} />
              
              <button 
                onClick={savePreset} 
                className="panel-btn action-btn" 
                title="Save Preset"
                style={{
                  background: ["no_name", "no_user", "error"].includes(presetSaveStatus) ? '#ff4757' : (presetSaveStatus === "saved" ? '#00e676' : 'transparent'),
                  color: presetSaveStatus !== "idle" ? (presetSaveStatus === "saved" ? '#000' : '#fff') : 'var(--text-light)',
                  border: presetSaveStatus !== "idle" ? 'none' : '1px solid var(--border-dark)',
                  transition: 'all 0.2s',
                  minWidth: '85px',
                  justifyContent: 'center',
                  fontWeight: presetSaveStatus !== "idle" ? 'bold' : 'normal'
                }}
              >
                {presetSaveStatus === "idle" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                )}
                {presetSaveStatus === "idle" ? "Save" :
                 presetSaveStatus === "no_name" ? "⚠️ NAME" :
                 presetSaveStatus === "no_user" ? "⚠️ LOGIN" :
                 presetSaveStatus === "saved" ? "✔️ SAVED" : "⚠️ ERROR"}
              </button>

              <div className="panel-divider"></div>
              <select className="led-select" onChange={(e) => { const index = e.target.value; if (index !== "") loadPreset(presets[index]); }}>
                <option value="">Load preset...</option>
                {presets.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
              </select>
              
              <button className="panel-btn danger-icon-btn" title="Delete Preset" onClick={initiateDeletePreset}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>

          <div className="hardware-panel">
            <div className="panel-label">TOOLS</div>
            <div className="panel-controls grid-tools-group">
              <Knob label="STEPS" value={stepsCount} min={8} max={32} step={1} onChange={setStepsCount} />
              <div className="panel-divider"></div>
              <div className="trigger-pad-wrapper">
                <div className="knob-label" style={{ color: '#ff4757' }}>CLEAR</div>
                <button onClick={clearBeat} className="trigger-pad" title="Clear Grid">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
                <div className="pad-spacer"></div>
              </div>
              <div className="panel-divider"></div>
              <button className="panel-btn action-btn" onClick={() => setShowMixer(!showMixer)} title="Toggle Mixer Console" style={{ background: showMixer ? 'var(--accent)' : 'transparent', color: showMixer ? '#fff' : 'var(--text-light)' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M4 22v-7"></path><path d="M4 11V2"></path><path d="M20 22v-5"></path><path d="M20 13V2"></path><path d="M12 22v-11"></path><path d="M12 7V2"></path><line x1="2" y1="11" x2="6" y2="11"></line><line x1="10" y1="7" x2="14" y2="7"></line><line x1="18" y1="13" x2="22" y2="13"></line></svg>
                MIXER
              </button>

              <button 
                onClick={initiateSaveToLivePad} 
                className="panel-btn action-btn" 
                style={{ 
                  fontWeight: 'bold', 
                  background: saveStatus === 'empty' ? '#ff4757' : (saveStatus === 'saved' ? '#00e676' : 'var(--accent)'), 
                  color: '#fff', 
                  border: 'none', 
                  marginLeft: '10px',
                  transition: 'all 0.2s',
                  width: '130px', 
                  justifyContent: 'center'
                }}
              >
                {saveStatus === 'empty' ? '⚠️ EMPTY' : saveStatus === 'saved' ? '✔️ SAVED' : '💾 TO LIVE PAD'}
              </button>

            </div>
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: isLocked ? '250px' : 'auto' }}>
          
          {isLocked && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
              zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
              <div style={{ fontSize: '45px', marginBottom: '10px', textShadow: '0 0 20px rgba(255, 215, 0, 0.5)' }}>🔒</div>
              <h3 style={{ color: '#FFD700', margin: '0 0 10px 0', letterSpacing: '2px', fontSize: '20px' }}>PRO SOUNDBANK</h3>
              <p style={{ color: '#ddd', margin: 0, fontSize: '14px' }}>The <strong>{kits[currentKitIndex].name}</strong> kit is exclusive to Pro users.</p>
              <p style={{ color: '#888', fontSize: '13px', marginTop: '12px' }}>Click <strong style={{color: '#FFD700'}}>⭐ UNLOCK PRO</strong> in the top bar to access.</p>
            </div>
          )}

          {!showMixer ? (
            <div className="grid-view-container">
              {currentSounds.map((sound, rowIndex) => {
                const safeName = sound?.name ? String(sound.name) : "Track";
                const displayName = safeName.length > 10 ? safeName.substring(0, 8) + ".." : safeName;

                return (
                  <div key={`${safeName}-${rowIndex}`} className={`sequencer-row ${mutedTracks[rowIndex] ? "muted" : ""}`}>
                    <div className="track-label">
                      <span className="track-name" title={safeName}>{displayName}</span>
                      <div className="track-controls">
                        <button className="track-options-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, rowIndex: rowIndex, startStep: 0 }); }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                      </div>
                    </div>

                    <div className="steps" onMouseUp={() => (dragMode.current = null)} onMouseLeave={() => (dragMode.current = null)}>
                      {(grid[rowIndex] || Array(Number(stepsCount)).fill(false)).map((active, stepIndex) => {
                        const isAltGroup = Math.floor(stepIndex / 4) % 2 === 1;
                        return (
                          <div key={stepIndex} className={`step ${active ? "active" : ""} ${currentStep === stepIndex ? "current" : ""} ${isAltGroup ? "alt-group" : ""}`}
                            onMouseDown={(e) => { isDraggingRef.current = false; if (e.button === 2) { dragMode.current = "erase"; updateStep(rowIndex, stepIndex, false); } else { dragMode.current = "paint"; updateStep(rowIndex, stepIndex, true); } }}
                            onMouseEnter={() => { if (!dragMode.current) return; isDraggingRef.current = true; updateStep(rowIndex, stepIndex, dragMode.current === "paint"); }}
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        );
                      })}
                    </div>
                    <div className="track-volume" style={{ display: 'none' }}></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Mixer currentSounds={currentSounds} volumes={volumes} setVolumes={setVolumes} mutedTracks={mutedTracks} setMutedTracks={setMutedTracks} />
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <input type="file" accept=".wav,.mp3,.ogg,audio/wav,audio/mpeg,audio/ogg" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
          
          <button className="panel-btn" onClick={() => { if (currentUser?.isPro) { fileInputRef.current.click(); } else { setShowProModal(true); } }} style={{ flex: 1, padding: '12px', borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', letterSpacing: '2px', color: 'var(--text-muted)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', width: '16px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            UPLOAD SAMPLE {currentUser?.isPro ? "" : "👑"}
          </button>

          <select className="panel-btn" style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px dashed rgba(166, 74, 255, 0.4)', color: 'var(--accent)', cursor: 'pointer', outline: 'none', letterSpacing: '2px', textAlign: 'center', appearance: 'none' }}
            onChange={(e) => { const selectedId = e.target.value; const sample = mySamples.find(s => String(s.id) === String(selectedId)); if (sample) addTrackFromBrowser(sample); e.target.value = ""; }}>
            <option value="" style={{ background: '#0f0f13', color: '#fff' }}>+ FROM BROWSER...</option>
            {mySamples.map(s => <option key={s.id} value={s.id} style={{ background: '#0f0f13', color: '#fff' }}>{s.name}</option>)}
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
            <div className="context-item danger" onClick={() => { deleteTrack(contextMenu.rowIndex); setContextMenu({...contextMenu, visible: false}); }}>Delete track</div>
          </div>
        )}
      </div>
    </>
  );
}