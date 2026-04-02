import React from "react";
import "../styles/mixer.css"; 

export default function Mixer({ currentSounds, volumes, setVolumes, mutedTracks, setMutedTracks }) {
  return (
    <div className="mixer-console">
      {/* VERTICAL MIXER DESK */}
      {currentSounds.map((sound, rowIndex) => (
        <div key={`mixer-${rowIndex}`} className={`channel-strip ${mutedTracks[rowIndex] ? "muted" : ""}`}>
          
          <div className="channel-header">CH {rowIndex + 1}</div>
          
          <div className="channel-name" title={sound.name}>
            {sound.name.length > 8 ? sound.name.substring(0, 6) + ".." : sound.name}
          </div>
          
          <div className="fader-container">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volumes[rowIndex]} 
              className="fader" 
              onChange={(e) => {
                const copy = [...volumes]; 
                copy[rowIndex] = Number(e.target.value); 
                setVolumes(copy);
              }} 
            />
          </div>

          <button 
            className={`channel-mute-btn ${mutedTracks[rowIndex] ? "active" : ""}`} 
            onClick={() => {
              setMutedTracks(prev => { 
                const copy = [...prev]; 
                copy[rowIndex] = !copy[rowIndex]; 
                return copy; 
              });
            }}
          >
            MUTE
          </button>

        </div>
      ))}
    </div>
  );
}