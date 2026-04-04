import React, { useState, useEffect, useRef } from "react";
import "../styles/livepad.css";

const initialDrumKits = [
  { name: "MODERN 808", sounds: [{ file: "/sounds/kick.wav" }, { file: "/sounds/snare.wav" }, { file: "/sounds/hihat.wav" }] },
  { name: "ACOUSTIC", sounds: [{ file: "/sounds/kick-acoustic.wav" }, { file: "/sounds/snare-acoustic.wav" }, { file: "/sounds/hihat-acoustic.wav" }] },
  { name: "SYNTHWAVE", sounds: [{ file: "/sounds/kick-retro.wav" }, { file: "/sounds/snare-retro.wav" }, { file: "/sounds/hihat-retro.wav" }] },
  { name: "LO-FI CHILL", sounds: [{ file: "/sounds/kick-lofi.wav" }, { file: "/sounds/snare-lofi.wav" }, { file: "/sounds/hihat-lofi.wav" }] },
  { name: "TECHNO HOUSE", sounds: [{ file: "/sounds/kick-techno.wav" }, { file: "/sounds/snare-techno.wav" }, { file: "/sounds/hihat-techno.wav" }] },
  { name: "DUBSTEP GRIME", sounds: [{ file: "/sounds/kick-dubstep.wav" }, { file: "/sounds/snare-dubstep.wav" }, { file: "/sounds/hihat-dubstep.wav" }] },
  { name: "USER KIT", sounds: [{ file: "/sounds/kick.wav" }] }
];

export default function LivePad({ projectPatterns = [], setProjectPatterns, isPlaying, activeStudioView, bpm = 120, playbackStartTime }) {
  const [activePads, setActivePads] = useState([]);
  
  const audioPlayersRef = useRef({});
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const lastPlayedTickRef = useRef(-1);

  const isCurrentlyPlaying = isPlaying && activeStudioView === "livepad";

  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current && AudioContext) audioCtxRef.current = new AudioContext();
    
    const wakeAudio = () => {
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    };
    window.addEventListener('mousedown', wakeAudio);
    return () => window.removeEventListener('mousedown', wakeAudio);
  }, []);

  useEffect(() => {
    initialDrumKits.forEach(kit => {
      kit.sounds.forEach(sound => {
        if (!audioPlayersRef.current[sound.file]) {
          const audio = new Audio(sound.file);
          audio.preload = "auto";
          audioPlayersRef.current[sound.file] = audio;
        }
      });
    });
  }, []);

  const togglePad = (pattern) => {
    if (activePads.includes(pattern.id)) {
      setActivePads(activePads.filter(id => id !== pattern.id));
    } else {
      setActivePads([...activePads, pattern.id]);
    }
  };

  const deletePattern = (e, id) => {
    e.stopPropagation(); 
    if (setProjectPatterns) {
      setProjectPatterns(prev => prev.filter(p => p.id !== id));
    }
    setActivePads(prev => prev.filter(padId => padId !== id)); 
  };

  const clearAllPads = () => {
    if (setProjectPatterns) setProjectPatterns([]);
    setActivePads([]);
  };

  const playSynthNote = (freq, durationInSeconds) => {
    if (!audioCtxRef.current) return;
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();

    const osc = audioCtxRef.current.createOscillator();
    const gainNode = audioCtxRef.current.createGain();
    const filter = audioCtxRef.current.createBiquadFilter();

    osc.type = "sawtooth"; filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, audioCtxRef.current.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, audioCtxRef.current.currentTime + (durationInSeconds * 0.9));
    osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);

    gainNode.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtxRef.current.currentTime + 0.02); 
    gainNode.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime + Math.max(0, durationInSeconds - 0.05)); 
    gainNode.gain.linearRampToValueAtTime(0.001, audioCtxRef.current.currentTime + durationInSeconds); 

    osc.connect(filter); filter.connect(gainNode); gainNode.connect(audioCtxRef.current.destination);
    osc.start(); osc.stop(audioCtxRef.current.currentTime + durationInSeconds + 0.1);
  };

  const getNoteFreq = (row) => {
    const arr = [];
    for (let octaveOffset = 2; octaveOffset >= -1; octaveOffset--) {
      for (let noteIndex = 11; noteIndex >= 0; noteIndex--) {
        const absoluteIndex = noteIndex + (octaveOffset * 12);
        arr.push(261.63 * Math.pow(2, absoluteIndex / 12));
      }
    }
    return arr[row] || 440;
  };

  useEffect(() => {
    if (!isCurrentlyPlaying || activePads.length === 0) {
      clearTimeout(intervalRef.current);
      lastPlayedTickRef.current = -1;
      return;
    }

    clearTimeout(intervalRef.current);
    
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    
    // 🛠️ THE CUTOFF MELODY FIX: Dynamically find the longest pattern being played!
    let activeStepsCount = 16; 
    activePads.forEach(padId => {
      const pattern = (projectPatterns || []).find(p => p.id === padId);
      if (pattern && pattern.stepsCount) {
        activeStepsCount = Math.max(activeStepsCount, pattern.stepsCount);
      }
    });

    const TICKS_PER_BEAT = 48; 
    const tickDurationMs = (60000 / bpm) / TICKS_PER_BEAT; 
    const globalLoopTicks = activeStepsCount * (TICKS_PER_BEAT / 4); 

    const engineStartTime = playbackStartTime || Date.now();

    if (Date.now() - engineStartTime < 50) {
      lastPlayedTickRef.current = -1;
    }

    const scheduleNextTick = () => {
      const elapsedMs = Date.now() - engineStartTime;
      const absoluteTick = Math.floor(elapsedMs / tickDurationMs);
      const currentGlobalTick = absoluteTick % globalLoopTicks;

      if (currentGlobalTick !== lastPlayedTickRef.current) {
        const ticksToProcess = new Set();
        
        if (lastPlayedTickRef.current === -1) {
          for (let t = 0; t <= currentGlobalTick; t++) ticksToProcess.add(t);
        } else if (currentGlobalTick > lastPlayedTickRef.current) {
          for (let t = lastPlayedTickRef.current + 1; t <= currentGlobalTick; t++) {
            ticksToProcess.add(t);
          }
        } else {
          for (let t = lastPlayedTickRef.current + 1; t < globalLoopTicks; t++) {
            ticksToProcess.add(t);
          }
          for (let t = 0; t <= currentGlobalTick; t++) {
            ticksToProcess.add(t);
          }
        }

        ticksToProcess.forEach(tick => {
          activePads.forEach(padId => {
            const pattern = (projectPatterns || []).find(p => p.id === padId);
            if (!pattern) return;

            // 🛠️ Wrap the global tick so a 16-step drum loops smoothly under a 32-step melody!
            const pSteps = pattern.stepsCount || 16;
            const pTotalTicks = pSteps * (TICKS_PER_BEAT / 4);
            const localTick = tick % pTotalTicks; 

            if (pattern.type === 'drum') {
              if (localTick % 12 === 0) {
                const currentDrumStep = localTick / 12;
                const kit = initialDrumKits[pattern.data.kitIndex] || initialDrumKits[0];
                
                pattern.data.grid.forEach((row, rowIndex) => {
                  if (row && row[currentDrumStep]) {
                    const audio = audioPlayersRef.current[kit.sounds[rowIndex]?.file];
                    if (audio) {
                      audio.currentTime = 0;
                      audio.volume = pattern.data.volumes[rowIndex] || 1;
                      audio.play().catch(e => {});
                    }
                  }
                });
              }
            }

            if (pattern.type === 'melody') {
              (pattern.data || []).forEach(note => {
                const noteStartTick = Math.round(note.startBeat * TICKS_PER_BEAT);
                if (noteStartTick === localTick) {
                  const durationInSecs = (60 / bpm) * note.durationBeats;
                  const freq = getNoteFreq(note.row);
                  playSynthNote(freq, durationInSecs);
                }
              });
            }
          });
        });

        lastPlayedTickRef.current = currentGlobalTick;
      }

      const nextAbsoluteTick = absoluteTick + 1;
      const timeOfNextTick = engineStartTime + (nextAbsoluteTick * tickDurationMs);
      const timeUntilNext = Math.max(0, timeOfNextTick - Date.now());

      intervalRef.current = setTimeout(scheduleNextTick, timeUntilNext);
    };

    scheduleNextTick();

    return () => clearTimeout(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentlyPlaying, activePads, bpm, projectPatterns, playbackStartTime]);

  const totalPads = 16;
  const pads = Array.from({ length: totalPads }).map((_, i) => (projectPatterns || [])[i] || null);

  return (
    <div className="live-pad-workspace">
      <div className="pad-header">
        <div className="sequencer-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="header-icon" style={{ background: '#111', padding: '8px', borderRadius: '6px', fontSize: '20px' }}>🎛️</div>
          <h2 className="workspace-title" style={{ margin: 0, color: '#fff' }}>Live Performance</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="panel-btn danger-icon-btn" onClick={clearAllPads} style={{ fontWeight: 'bold' }}>
            CLEAR ALL PADS
          </button>
        </div>
      </div>

      <div className="pad-grid">
        {pads.map((pattern, index) => {
          const isActive = pattern ? activePads.includes(pattern.id) : false;
          const baseColor = pattern ? (pattern.type === 'drum' ? '#00e676' : '#a64aff') : '#1a1a20';
          const bgColor = isActive ? baseColor : (pattern ? '#222' : '#141418');
          const textColor = isActive ? '#000' : '#fff';
          const glow = isActive ? `0 0 25px ${baseColor}` : 'none';

          return (
            <button
              key={index}
              className="launch-pad"
              onClick={() => pattern && togglePad(pattern)}
              style={{
                background: bgColor,
                border: `2px solid ${pattern ? baseColor : '#222'}`,
                color: textColor,
                cursor: pattern ? 'pointer' : 'default',
                boxShadow: glow,
                opacity: pattern ? 1 : 0.4,
                position: 'relative'
              }}
            >
              {pattern ? (
                <>
                  <div 
                    onClick={(e) => deletePattern(e, pattern.id)}
                    style={{
                      position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: '#ff4757', borderRadius: '50%',
                      width: '22px', height: '22px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(255, 71, 87, 0.4)'
                    }}
                    title="Delete Pattern"
                    onMouseEnter={(e) => e.currentTarget.style.background = '#ff4757'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                  >✕</div>
                  <span className="pad-icon">{pattern.type === 'drum' ? '🥁' : '🎹'}</span>
                  {pattern.name}
                </>
              ) : (
                <span style={{ color: '#555' }}>Empty</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}