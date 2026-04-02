import React, { useState, useEffect, useRef } from "react";
import "../styles/livepad.css";

// We need the kits here to play the drum sounds
const initialDrumKits = [
  { name: "MODERN 808", sounds: [{ file: "/sounds/kick.wav" }, { file: "/sounds/snare.wav" }, { file: "/sounds/hihat.wav" }] },
  { name: "ACOUSTIC", sounds: [{ file: "/sounds/kick-acoustic.wav" }, { file: "/sounds/snare-acoustic.wav" }, { file: "/sounds/hihat-acoustic.wav" }] },
  { name: "SYNTHWAVE", sounds: [{ file: "/sounds/kick-retro.wav" }, { file: "/sounds/snare-retro.wav" }, { file: "/sounds/hihat-retro.wav" }] },
  { name: "LO-FI CHILL", sounds: [{ file: "/sounds/kick-lofi.wav" }, { file: "/sounds/snare-lofi.wav" }, { file: "/sounds/hihat-lofi.wav" }] },
  { name: "TECHNO HOUSE", sounds: [{ file: "/sounds/kick-techno.wav" }, { file: "/sounds/snare-techno.wav" }, { file: "/sounds/hihat-techno.wav" }] },
  { name: "DUBSTEP GRIME", sounds: [{ file: "/sounds/kick-dubstep.wav" }, { file: "/sounds/snare-dubstep.wav" }, { file: "/sounds/hihat-dubstep.wav" }] },
  { name: "USER KIT", sounds: [{ file: "/sounds/kick.wav" }] }
];

const SCALES = {
  "Major": [0, 2, 4, 5, 7, 9, 11], "Minor": [0, 2, 3, 5, 7, 8, 10],
  "Pentatonic Minor": [0, 3, 5, 7, 10], "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11]
};

export default function LivePad({ projectPatterns = [], isPlaying, activeStudioView, bpm = 120, playbackStartTime }) {
  const [activePads, setActivePads] = useState([]);
  
  const audioPlayersRef = useRef({});
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const lastPlayedTickRef = useRef(-1);

  // 🎧 CONTEXT-AWARE PLAYBACK
  const isCurrentlyPlaying = isPlaying && activeStudioView === "livepad";

  // 1. Initialize Audio Context for Synths
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current && AudioContext) audioCtxRef.current = new AudioContext();
  }, []);

  // 2. Preload Drum Sounds
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

  // Helper to calculate frequencies for saved melodies
  const getNoteFreq = (row, rootNote, scaleType) => {
    const arr = [];
    for (let octaveOffset = 2; octaveOffset >= -1; octaveOffset--) {
      for (let noteIndex = 11; noteIndex >= 0; noteIndex--) {
        const absoluteIndex = noteIndex + (octaveOffset * 12);
        const intervalFromRoot = (noteIndex - rootNote + 12) % 12;
        if (SCALES[scaleType].includes(intervalFromRoot)) {
          arr.push(261.63 * Math.pow(2, absoluteIndex / 12));
        }
      }
    }
    return arr[row] || 440;
  };

  // 3. THE MASTER LIVE ENGINE
  useEffect(() => {
    if (!isCurrentlyPlaying || activePads.length === 0) {
      clearInterval(intervalRef.current);
      lastPlayedTickRef.current = -1;
      return;
    }

    clearInterval(intervalRef.current);
    
    // We run the engine at 48 ticks per beat (high res for melodies)
    const TICKS_PER_BEAT = 48; 
    const tickDurationMs = (60000 / bpm) / TICKS_PER_BEAT; 
    const totalLoopTicks = 16 * (TICKS_PER_BEAT / 4); // Assume 16 steps default for now

    // If there is no global start time, use local time (fallback)
    const engineStartTime = playbackStartTime || Date.now();

    intervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - engineStartTime;
      const absoluteTick = Math.floor(elapsedMs / tickDurationMs);
      const currentLoopTick = absoluteTick % totalLoopTicks;

      if (currentLoopTick !== lastPlayedTickRef.current) {
        
        // Loop through all active pads
        activePads.forEach(padId => {
          const pattern = projectPatterns.find(p => p.id === padId);
          if (!pattern) return;

          if (pattern.type === 'drum') {
            // Convert high-res ticks (48/beat) to drum steps (4/beat)
            // Drums trigger every 12 ticks
            if (currentLoopTick % 12 === 0) {
              const currentDrumStep = (currentLoopTick / 12) % 16;
              const kit = initialDrumKits[pattern.data.kitIndex] || initialDrumKits[0];
              
              pattern.data.grid.forEach((row, rowIndex) => {
                if (row[currentDrumStep]) {
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
            pattern.data.forEach(note => {
              const noteStartTick = Math.round(note.startBeat * TICKS_PER_BEAT);
              if (noteStartTick === currentLoopTick) {
                const durationInSecs = (60 / bpm) * note.durationBeats;
                const freq = getNoteFreq(note.row, pattern.root, pattern.scale);
                playSynthNote(freq, durationInSecs);
              }
            });
          }
        });

        lastPlayedTickRef.current = currentLoopTick;
      }
    }, 10);

    return () => clearInterval(intervalRef.current);
  }, [isCurrentlyPlaying, activePads, bpm, projectPatterns, playbackStartTime]);

  const totalPads = 16;
  const pads = Array.from({ length: totalPads }).map((_, i) => projectPatterns[i] || null);

  return (
    <div className="live-pad-workspace">
      <div className="pad-header">
        <div className="sequencer-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="header-icon" style={{ background: '#111', padding: '8px', borderRadius: '6px', fontSize: '20px' }}>🎛️</div>
          <h2 className="workspace-title" style={{ margin: 0, color: '#fff' }}>Live Performance</h2>
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
                opacity: pattern ? 1 : 0.4
              }}
            >
              {pattern ? (
                <>
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