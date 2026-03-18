import React from "react";
import "../styles/sidebar.css";

export default function Sidebar({ activeView, setActiveView }) {
  // Array of menu items makes it easy to map over and apply the active class
  const menuItems = ["Step Sequencer", "Beat Maker", "My Samples", "Settings"];

  return (
    <div className="sidebar">
      <h2 className="logo">BeatForge</h2>

      <div className="menu">
        {menuItems.map((item) => (
          <p
            key={item}
            className={`menu-item ${activeView === item ? "active" : ""}`}
            onClick={() => setActiveView(item)}
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}