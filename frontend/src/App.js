import React, { useState, useEffect } from "react";
import Landing from "./components/Landing";
import Auth from "./components/Auth";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import StepSequencer from "./components/StepSequencer";
import MelodyMatrix from "./components/MelodyMatrix";
import LivePad from "./components/LivePad"; 
import Community from "./components/Community";
import "./App.css";

export default function App() {
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('studio')) return 'studio';
    if (hash === 'auth') return 'auth';
    if (hash === 'community') return 'community'; 
    return 'landing';
  };

  const getInitialStudioView = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash.includes('/beatmaker')) return 'beatmaker';
    if (hash.includes('/livepad')) return 'livepad'; 
    return 'sequencer'; 
  };

  const [currentView, setCurrentView] = useState(getInitialView());
  const [activeStudioView, setActiveStudioView] = useState(getInitialStudioView());
  
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("beatforge_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [stepsCount, setStepsCount] = useState(16);
  const [mySamples, setMySamples] = useState([]);
  const [hasActiveBeat, setHasActiveBeat] = useState(false);

  const [projectPatterns, setProjectPatterns] = useState([]);
  const [playbackStartTime, setPlaybackStartTime] = useState(0);

  useEffect(() => {
    if (currentView === "auth" || currentView === "community") setIsPlaying(false);
  }, [currentView]);

  useEffect(() => {
    if (isPlaying) {
      setPlaybackStartTime(Date.now());
    }
  }, [isPlaying]);

  useEffect(() => {
    if (activeStudioView === 'livepad') {
      setIsPlaying(false);
    }
  }, [activeStudioView]);

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
        if (hash.includes('/livepad')) { 
          setActiveStudioView('livepad');
        } else if (hash.includes('/beatmaker')) {
          setActiveStudioView('beatmaker');
        } else {
          setActiveStudioView('sequencer');
        }
      } else if (hash === 'auth') {
        setCurrentView('auth');
      } else if (hash === 'community') {
        setCurrentView('community'); 
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
    localStorage.setItem("beatforge_user", JSON.stringify(userData)); 
    setUser(userData);
    setCurrentView("studio"); 
  };

  const handleUpgradeSuccess = () => {
    if (!user) return;
    const upgradedUser = { ...user, isPro: true };
    setUser(upgradedUser);
    localStorage.setItem("beatforge_user", JSON.stringify(upgradedUser));
  };

  const handleLogout = () => {
    localStorage.removeItem("beatforge_token"); 
    localStorage.removeItem("beatforge_user"); 
    setUser(null);                               
    setIsPlaying(false); 
    setHasActiveBeat(false); 
    setMySamples([]); 
    setProjectPatterns([]); 
    setCurrentView("landing");                  
  };

  const isLoggedIn = !!localStorage.getItem("beatforge_token");

  return (
    <div className="app-container">
      
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
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
        </div>
      )}

      {currentView === "landing" && (
        <Landing 
          onLaunch={() => setCurrentView(isLoggedIn ? "studio" : "auth")} 
          isLoggedIn={isLoggedIn} 
          setCurrentView={setCurrentView} // 🌟 Passed down to allow Community navigation
        />
      )}

      {currentView === "auth" && (
        <Auth onLogin={handleLogin} onBack={() => setCurrentView("landing")} />
      )}

      {/* 🌟 FIX: Only render TopBar and Studio Workspace when in Studio View */}
      <div 
        className="studio-master-container"
        style={{ 
          display: currentView === "studio" ? "flex" : "none", 
          flexDirection: "column", height: "100vh", width: "100vw" 
        }}
      >
        <TopBar 
          setCurrentView={setCurrentView} activeView={currentView} isPlaying={isPlaying} setIsPlaying={setIsPlaying} bpm={bpm} setBpm={setBpm} masterVolume={masterVolume} setMasterVolume={setMasterVolume} onLogout={handleLogout} currentUser={user} stepsCount={stepsCount} 
          onUpgradeSuccess={handleUpgradeSuccess} /* 🌟 NEW PROP PASSED HERE */
        />
        
        <div className="main-workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar setCurrentView={setCurrentView} activeStudioView={activeStudioView} setActiveStudioView={setActiveStudioView} mySamples={mySamples} setMySamples={setMySamples} currentUser={user} />
          
          <div className="sequencer-wrapper" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: activeStudioView === "sequencer" ? "block" : "none" }}>
              <StepSequencer isPlaying={isPlaying} activeStudioView={activeStudioView} playbackStartTime={playbackStartTime} bpm={bpm} setBpm={setBpm} masterVolume={masterVolume} currentUser={user} setHasActiveBeat={setHasActiveBeat} stepsCount={stepsCount} setStepsCount={setStepsCount} mySamples={mySamples} projectPatterns={projectPatterns} setProjectPatterns={setProjectPatterns} />
            </div>
            <div style={{ display: activeStudioView === "beatmaker" ? "block" : "none", height: '100%' }}>
              <MelodyMatrix isPlaying={isPlaying} activeStudioView={activeStudioView} playbackStartTime={playbackStartTime} bpm={bpm} stepsCount={stepsCount} setHasActiveBeat={setHasActiveBeat} projectPatterns={projectPatterns} setProjectPatterns={setProjectPatterns} currentUser={user} />
            </div>
            <div style={{ display: activeStudioView === "livepad" ? "block" : "none", height: '100%' }}>
              <LivePad projectPatterns={projectPatterns} setProjectPatterns={setProjectPatterns} isPlaying={isPlaying} activeStudioView={activeStudioView} bpm={bpm} playbackStartTime={playbackStartTime} />
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 FIX: Render Community standalone with no TopBar */}
      {currentView === "community" && (
        <div style={{ height: '100vh', width: '100vw', overflowY: 'auto', background: 'var(--bg-dark)' }}>
          <Community currentUser={user} onNavigate={setCurrentView} />
        </div>
      )}

    </div>
  );
}