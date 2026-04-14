import React, { useState, useEffect, useCallback, useRef } from "react";
import "../../styles/knob.css";

// Pure helper — lives outside the component so hooks never need it as a dep
const clamp = (v, min, max, step) => Math.round(Math.max(min, Math.min(max, v)) / step) * step;

export default function Knob({ label, value, min, max, step = 1, onChange }) {
  const [isDragging,  setIsDragging]  = useState(false);
  const [startY,      setStartY]      = useState(0);
  const [startVal,    setStartVal]    = useState(value);
  const [inputValue,  setInputValue]  = useState(Math.round(value));
  const wrapperRef = useRef(null);

  // Keep input in sync when value changes externally
  useEffect(() => { setInputValue(Math.round(value)); }, [value]);

  // Mouse wheel scrolls the value
  useEffect(() => {
    const onWheel = (e) => { e.preventDefault(); onChange(clamp(value + (e.deltaY < 0 ? step : -step), min, max, step)); };
    const el = wrapperRef.current;
    el?.addEventListener("wheel", onWheel, { passive: false });
    return () => el?.removeEventListener("wheel", onWheel);
  }, [value, min, max, step, onChange]);

  // Drag handlers
  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;
    onChange(clamp(startVal + ((startY - e.clientY) / 150) * (max - min), min, max, step));
  }, [isDragging, startY, startVal, max, min, step, onChange]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) { window.addEventListener("mousemove", onMouseMove); window.addEventListener("mouseup", onMouseUp); }
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [isDragging, onMouseMove, onMouseUp]);

  // Typing into the input
  const commitInput = () => { const v = clamp(isNaN(Number(inputValue)) ? min : Number(inputValue), min, max, step); onChange(v); setInputValue(v); };

  // Rotation angle for the dial
  const deg = -135 + ((value - min) / (max - min)) * 270;

  return (
    <div className="knob-wrapper" ref={wrapperRef}>
      <div className="knob-label">{label}</div>
      <div className="knob-base" onMouseDown={e => { setIsDragging(true); setStartY(e.clientY); setStartVal(value); }}>
        <div className="knob-dial" style={{ transform: `rotate(${deg}deg)` }}>
          <div className="knob-indicator" />
        </div>
      </div>
      <input type="number" className="knob-input" value={inputValue} onChange={e => setInputValue(e.target.value)} onBlur={commitInput} onKeyDown={e => e.key === "Enter" && commitInput()} />
    </div>
  );
}