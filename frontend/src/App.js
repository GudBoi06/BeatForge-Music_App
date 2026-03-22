import React, { useState, useEffect } from "react";
import Landing from "./components/Landing";
import Auth from "./components/Auth";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import StepSequencer from "./components/StepSequencer";
import "./App.css";

export default function App() {
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('studio')) return 'studio';
    if (hash === 'auth') return 'auth';
    return 'landing';
  };

  const getInitialStudioView = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash.includes('/beatmaker')) return 'beatmaker';
    return 'sequencer'; 
  };

  const [currentView, setCurrentView] = useState(getInitialView());
  const [activeStudioView, setActiveStudioView] = useState(getInitialStudioView());
  // 🧠 Initialize user from Local Storage so it survives page reloads!
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("beatforge_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [masterVolume, setMasterVolume] = useState(0.8);
  
  // 🛑 NEW: Track if the user has actually drawn a beat
  const [hasActiveBeat, setHasActiveBeat] = useState(false);

  useEffect(() => {
    if (currentView === "auth") setIsPlaying(false);
  }, [currentView]);

  useEffect(() => {
    let newHash = currentView;
    if (currentView === 'studio') newHash = `studio/${activeStudioView}`;
    if (window.location.hash !== `#${newHash}`) {
      window.history.pushState(null, '', `#${newHash}`);
    }
  }, [currentView, activeStudioView]);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('studio')) {
        setCurrentView('studio');
        setActiveStudioView(hash.includes('/beatmaker') ? 'beatmaker' : 'sequencer');
      } else if (hash === 'auth') {
        setCurrentView('auth');
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("beatforge_token");
    if (token && currentView === "landing" && window.location.hash === "") {
      setCurrentView("studio");
    }
  }, [currentView]);

  const handleLogin = (userData) => {
    localStorage.setItem("beatforge_user", JSON.stringify(userData)); // 👈 NEW
    setUser(userData);
    setCurrentView("studio"); 
  };

  const handleLogout = () => {
    localStorage.removeItem("beatforge_token"); 
    localStorage.removeItem("beatforge_user"); // 👈 NEW
    setUser(null);                              
    setIsPlaying(false); 
    setHasActiveBeat(false); 
    setCurrentView("landing");                  
  };

  const isLoggedIn = !!localStorage.getItem("beatforge_token");

  return (
    <div className="app-container">
      
      {/* 🎧 FLOATING PLAYER: Now requires login AND an active beat! */}
      {currentView === "landing" && isLoggedIn && hasActiveBeat && (
        <div className="floating-mini-player">
          <div className="mini-player-info">
            <div className={`status-dot ${isPlaying ? 'green' : 'red'}`}></div>
            <span className="mini-player-text">
              {isPlaying ? "Studio Active" : "Studio Paused"}
            </span>
          </div>
          <button 
            className={`mini-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause Beat" : "Play Beat"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
        </div>
      )}

      {currentView === "landing" && (
        <Landing 
          onLaunch={() => setCurrentView(isLoggedIn ? "studio" : "auth")} 
          isLoggedIn={isLoggedIn} 
        />
      )}

      {currentView === "auth" && (
        <Auth 
          onLogin={handleLogin} 
          onBack={() => setCurrentView("landing")} 
        />
      )}

      <div 
        className="studio-master-container"
        style={{ 
          display: currentView === "studio" ? "flex" : "none", 
          flexDirection: "column", 
          height: "100vh",
          width: "100vw"
        }}
      >
        <TopBar 
          isPlaying={isPlaying} 
          setIsPlaying={setIsPlaying}
          bpm={bpm}
          setBpm={setBpm}
          masterVolume={masterVolume}
          setMasterVolume={setMasterVolume}
          onLogout={handleLogout} 
          currentUser={user}
        />
        
        <div className="main-workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          <Sidebar 
            setCurrentView={setCurrentView} 
            activeStudioView={activeStudioView}
            setActiveStudioView={setActiveStudioView}
          />
          
          <div className="sequencer-wrapper" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            
            <div style={{ display: activeStudioView === "sequencer" ? "block" : "none" }}>
              <StepSequencer 
                isPlaying={isPlaying} 
                bpm={bpm} 
                setBpm={setBpm}
                masterVolume={masterVolume} 
                currentUser={user} /* 🛑 Pass user down for presets */
                setHasActiveBeat={setHasActiveBeat} /* 🛑 Pass tracker down */
              />
            </div>

            <div style={{ display: activeStudioView === "beatmaker" ? "flex" : "none", justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <h2>Beat Maker Workspace (Coming Soon)</h2>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}