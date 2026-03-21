import React, { useState, useEffect, useCallback, useRef } from "react";
import "../../styles/knob.css";

export default function Knob({ label, value, min, max, step = 1, onChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startVal, setStartVal] = useState(value);
  const [inputValue, setInputValue] = useState(Math.round(value));
  const wrapperRef = useRef(null);

  // Sync the text input when the value changes externally (like dragging)
  useEffect(() => {
    setInputValue(Math.round(value));
  }, [value]);

  // Handle Mouse Wheel Scrolling
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault(); // Stop the whole page from scrolling
      const delta = e.deltaY < 0 ? step : -step;
      let newVal = Math.max(min, Math.min(max, value + delta));
      onChange(newVal);
    };

    const current = wrapperRef.current;
    if (current) {
      current.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (current) current.removeEventListener("wheel", handleWheel);
    };
  }, [value, min, max, step, onChange]);

  // Handle Dragging
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartVal(value);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const deltaY = startY - e.clientY; 
    const range = max - min;
    const valChange = (deltaY / 150) * range;
    let newVal = startVal + valChange;
    
    newVal = Math.max(min, Math.min(max, newVal));
    if (step) newVal = Math.round(newVal / step) * step;
    
    onChange(newVal);
  }, [isDragging, startY, startVal, max, min, step, onChange]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle Typing
  const handleInputChange = (e) => setInputValue(e.target.value);
  
  const handleInputBlur = () => {
    let newVal = Number(inputValue);
    if (isNaN(newVal)) newVal = min;
    newVal = Math.max(min, Math.min(max, newVal)); // Clamp it between min/max
    onChange(newVal);
    setInputValue(newVal); // Format back to standard number
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleInputBlur();
  };

  const pct = (value - min) / (max - min);
  const deg = -135 + (pct * 270);

  return (
    <div className="knob-wrapper" ref={wrapperRef}>
      <div className="knob-label">{label}</div>
      <div className="knob-base" onMouseDown={handleMouseDown}>
        <div className="knob-dial" style={{ transform: `rotate(${deg}deg)` }}>
          <div className="knob-indicator"></div>
        </div>
      </div>
      {/* Replaced static div with an interactive input box */}
      <input 
        type="number"
        className="knob-input"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}