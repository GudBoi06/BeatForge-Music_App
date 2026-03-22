import React, { useState } from "react";
import "../styles/sidebar.css";

// 👇 Receive the new props from App.jsx
export default function Sidebar({ setCurrentView, activeStudioView, setActiveStudioView }) {
  const [openMenus, setOpenMenus] = useState({
    studio: true,  
    library: false
  });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 
          className="brand-logo" 
          onClick={() => setCurrentView('landing')} // Routes to landing page
          style={{ cursor: 'pointer' }}             // Makes it look clickable
        >
          BEATFORGE
        </h2>
      </div>

      <div className="sidebar-nav">
        
        {/* 🏠 HOME: Routes entirely out of the studio back to Landing */}
        <div 
          className="nav-item" 
          onClick={() => setCurrentView('landing')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Home</span>
        </div>

        <div className="nav-divider"></div>

        {/* 🎛️ STUDIO */}
        <div className="nav-group">
          <div className="nav-item has-child" onClick={() => toggleMenu('studio')}>
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              <span>Studio</span>
            </div>
            <span className={`chevron ${openMenus.studio ? 'open' : ''}`}>▾</span>
          </div>
          
          {openMenus.studio && (
            <div className="sub-menu">
              
              {/* Sets the active studio view to the Step Sequencer */}
              <div 
                className={`sub-item ${activeStudioView === 'sequencer' ? 'active' : ''}`} 
                onClick={() => setActiveStudioView('sequencer')}
              >
                Step Sequencer
              </div>
              
              {/* Sets the active studio view to the Beat Maker */}
              <div 
                className={`sub-item ${activeStudioView === 'beatmaker' ? 'active' : ''}`} 
                onClick={() => setActiveStudioView('beatmaker')}
              >
                Beat Maker
              </div>
              
              <div className="sub-item disabled">Mixer Console</div>
            </div>
          )}
        </div>

        {/* 📂 LIBRARY */}
        <div className="nav-group">
          <div className="nav-item has-child" onClick={() => toggleMenu('library')}>
            <div className="nav-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span>Library</span>
            </div>
            <span className={`chevron ${openMenus.library ? 'open' : ''}`}>▾</span>
          </div>
          
          {openMenus.library && (
            <div className="sub-menu">
              <div className="sub-item">My Samples</div>
              <div className="sub-item">My Presets</div>
              <div className="sub-item">Cloud Kits</div>
            </div>
          )}
        </div>

        <div className="nav-divider"></div>

        {/* ⚙️ SETTINGS */}
        <div className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span>Settings</span>
        </div>

      </div>
    </div>
  );
}