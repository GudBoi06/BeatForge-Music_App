import React, { useRef, useState, useEffect } from "react";
import "./knob.css";

export default function Knob({
  value,
  min,
  max,
  step = 1,
  label,
  onChange
}) {
  const startY = useRef(0);
  const startValue = useRef(value);

  const [localValue, setLocalValue] = useState(value);

useEffect(() => {
  setLocalValue(value);
}, [value]);


  const rotation =
    ((value - min) / (max - min)) * 270 - 135;

  const onMouseDown = (e) => {
    startY.current = e.clientY;
    startValue.current = value;

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e) => {
    const delta = startY.current - e.clientY;
    const range = max - min;
    const sensitivity = range / 180;

    let newValue =
      startValue.current + delta * sensitivity;

    newValue =
      Math.round(newValue / step) * step;

    newValue = Math.min(max, Math.max(min, newValue));

    onChange(newValue);
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const onWheel = (e) => {
  e.preventDefault();

  const delta = e.deltaY < 0 ? step : -step;

  let newValue = value + delta;
  newValue = Math.min(max, Math.max(min, newValue));

  onChange(newValue);
};


  return (
    <div className="knob-wrapper horizontal">
    <svg
        width="42"
        height="42"
        viewBox="0 0 100 100"
        className="knob-svg"
        onMouseDown={onMouseDown}
        onWheel={onWheel}   /* 👈 ADD THIS */
        >
      <circle
        cx="50"
        cy="50"
        r="42"
        className="knob-bg"
      />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="16"
        className="knob-indicator"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "50% 50%"
        }}
      />
    </svg>

    <div className="knob-info">
      <input
          type="number"
          className="knob-input"
          value={localValue}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            // Allow typing, but NOT empty
            const val = e.target.value;

            if (val === "") {
              setLocalValue("");
              return;
            }

            // Allow only numbers
            if (!/^\d+$/.test(val)) return;

            setLocalValue(val);
          }}
          onBlur={() => {
            let v = Number(localValue);

            // If empty or invalid → snap to min
            if (!localValue || isNaN(v)) {
              v = min;
            }

            // Clamp strictly
            v = Math.min(max, Math.max(min, v));

            setLocalValue(v);
            onChange(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.target.blur();
            }
          }}
        />

      <div className="knob-label">{label}</div>
    </div>
  </div>
  );
}
