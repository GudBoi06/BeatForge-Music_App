import React from "react";
import "../styles/topbar.css";

export default function TopBar({ activeView }) {
  return (
    <div className="topbar">
      {/* Dynamically update the title based on the active view */}
      <h2>{activeView}</h2>
      
      {/* You can keep your save button or other transport controls here */}
      <button className="save-btn">Save Project</button>
    </div>
  );
}