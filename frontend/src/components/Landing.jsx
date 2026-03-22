import React from "react";
import "../styles/landing.css";

// 👇 Receive the isLoggedIn prop
export default function Landing({ onLaunch, isLoggedIn }) {
  return (
    <div className="landing-wrapper">
      
      {/* 🧭 PREMIUM NAVBAR */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <span>BEATFORGE</span>
        </div>
        <button className="nav-login-btn" onClick={onLaunch}>
          {/* 👇 Change text based on login status */}
          {isLoggedIn ? "MY STUDIO" : "LOGIN / REGISTER"}
        </button>
      </nav>

      {/* 💥 HERO SECTION */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            THE NEXT-GEN <br />
            <span className="text-glow">BROWSER STUDIO</span>
          </h1>
          <p className="hero-subtitle">
            Produce, sequence, and arrange professional beats entirely in your browser. 
            No downloads. No hardware required. Infinite possibilities.
          </p>
          
          <div className="hero-actions">
            <button className="launch-btn" onClick={onLaunch}>
              {/* 👇 Change text based on login status */}
              {isLoggedIn ? "RETURN TO STUDIO" : "ENTER THE STUDIO"}
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* 🎛️ GEOMETRIC UI PREVIEW MOCKUP */}
        <div className="hero-visual">
          <div className="mockup-window">
            <div className="mockup-header">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <div className="mockup-body">
              <div className="mockup-track"></div>
              <div className="mockup-track alt"></div>
              <div className="mockup-track"></div>
            </div>
          </div>
          <div className="ambient-glow"></div>
        </div>
      </div>

    </div>
  );
}