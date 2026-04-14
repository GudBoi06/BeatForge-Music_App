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

// ─── Hash parsing (used on mount and on browser back/forward) ────────────────

const parseHash = () => {
  const hash = window.location.hash.replace("#", "");
  const view = hash.startsWith("studio") ? "studio"
             : hash === "auth"           ? "auth"
             : hash === "community"      ? "community"
             : "landing";
  const studioView = hash.includes("/livepad")   ? "livepad"
                   : hash.includes("/beatmaker")  ? "beatmaker"
                   : "sequencer";
  return { view, studioView };
};

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const initial = parseHash();

  const [currentView,      setCurrentView]      = useState(initial.view);
  const [activeStudioView, setActiveStudioView] = useState(initial.studioView);
  const [user,             setUser]             = useState(() => JSON.parse(localStorage.getItem("beatforge_user") || "null"));
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [bpm,              setBpm]              = useState(120);
  const [masterVolume,     setMasterVolume]     = useState(0.8);
  const [stepsCount,       setStepsCount]       = useState(16);
  const [mySamples,        setMySamples]        = useState([]);
  const [hasActiveBeat,    setHasActiveBeat]    = useState(false);
  const [projectPatterns,  setProjectPatterns]  = useState([]);
  const [playbackStartTime,setPlaybackStartTime]= useState(0);

  const isLoggedIn = !!localStorage.getItem("beatforge_token");

  // ── Side-effects ────────────────────────────────────────────────────────────

  // Stop playback when leaving studio, or switching to livepad
  useEffect(() => {
    if (currentView === "auth" || currentView === "community" || activeStudioView === "livepad") setIsPlaying(false);
  }, [currentView, activeStudioView]);

  // Record playback start time whenever play is toggled on
  useEffect(() => { if (isPlaying) setPlaybackStartTime(Date.now()); }, [isPlaying]);

  // Keep URL hash in sync with current view
  useEffect(() => {
    const newHash = currentView === "studio" ? `studio/${activeStudioView}` : currentView;
    if (window.location.hash !== `#${newHash}`) window.history.pushState(null, "", `#${newHash}`);
  }, [currentView, activeStudioView]);

  // Handle browser back / forward
  useEffect(() => {
    const onPopState = () => { const { view, studioView } = parseHash(); setCurrentView(view); setActiveStudioView(studioView); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ── Auth handlers ───────────────────────────────────────────────────────────

  const handleLogin = (userData) => {
    localStorage.setItem("beatforge_user", JSON.stringify(userData));
    setUser(userData);
    setCurrentView("landing");
  };

  const handleUpgradeSuccess = () => {
    if (!user) return;
    const upgraded = { ...user, isPro: true };
    setUser(upgraded);
    localStorage.setItem("beatforge_user", JSON.stringify(upgraded));
  };

  const handleLogout = () => {
    localStorage.removeItem("beatforge_token");
    localStorage.removeItem("beatforge_user");
    setUser(null); setIsPlaying(false); setHasActiveBeat(false); setMySamples([]); setProjectPatterns([]);
    setCurrentView("landing");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">

      {/* Mini player — shown on landing when a beat is loaded */}
      {currentView === "landing" && isLoggedIn && hasActiveBeat && (
        <div className="floating-mini-player">
          <div className="mini-player-info">
            <div className={`status-dot ${isPlaying ? "green" : "red"}`} />
            <span className="mini-player-text">{isPlaying ? "Studio Active" : "Studio Paused"}</span>
          </div>
          <button className={`mini-play-btn ${isPlaying ? "playing" : ""}`} onClick={() => setIsPlaying(v => !v)}>
            {isPlaying ? "⏸" : "▶"}
          </button>
        </div>
      )}

      {currentView === "landing"   && <Landing onLaunch={() => setCurrentView(isLoggedIn ? "studio" : "auth")} isLoggedIn={isLoggedIn} setCurrentView={setCurrentView} />}
      {currentView === "auth"      && <Auth onLogin={handleLogin} onBack={() => setCurrentView("landing")} />}
      {currentView === "community" && (
        <div style={{ height: "100vh", width: "100vw", overflowY: "auto", background: "var(--bg-dark)" }}>
          <Community currentUser={user} onNavigate={setCurrentView} />
        </div>
      )}

      {/* Studio — always mounted, hidden when not active (preserves sequencer state) */}
      <div className="studio-master-container" style={{ display: currentView === "studio" ? "flex" : "none", flexDirection: "column", height: "100vh", width: "100vw" }}>
        <TopBar
          setCurrentView={setCurrentView} activeView={currentView}
          isPlaying={isPlaying} setIsPlaying={setIsPlaying}
          bpm={bpm} setBpm={setBpm}
          masterVolume={masterVolume} setMasterVolume={setMasterVolume}
          onLogout={handleLogout} currentUser={user}
          stepsCount={stepsCount} onUpgradeSuccess={handleUpgradeSuccess}
        />
        <div className="main-workspace" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar setCurrentView={setCurrentView} activeStudioView={activeStudioView} setActiveStudioView={setActiveStudioView} mySamples={mySamples} setMySamples={setMySamples} currentUser={user} />
          <div className="sequencer-wrapper" style={{ flex: 1, padding: 20, overflowY: "auto" }}>
            <div style={{ display: activeStudioView === "sequencer" ? "block" : "none" }}>
              <StepSequencer isPlaying={isPlaying} activeStudioView={activeStudioView} playbackStartTime={playbackStartTime} bpm={bpm} setBpm={setBpm} masterVolume={masterVolume} currentUser={user} setHasActiveBeat={setHasActiveBeat} stepsCount={stepsCount} setStepsCount={setStepsCount} mySamples={mySamples} projectPatterns={projectPatterns} setProjectPatterns={setProjectPatterns} />
            </div>
            <div style={{ display: activeStudioView === "beatmaker" ? "block" : "none", height: "100%" }}>
              <MelodyMatrix isPlaying={isPlaying} activeStudioView={activeStudioView} playbackStartTime={playbackStartTime} bpm={bpm} stepsCount={stepsCount} setHasActiveBeat={setHasActiveBeat} projectPatterns={projectPatterns} setProjectPatterns={setProjectPatterns} currentUser={user} />
            </div>
            <div style={{ display: activeStudioView === "livepad" ? "block" : "none", height: "100%" }}>
              <LivePad masterVolume={masterVolume} projectPatterns={projectPatterns} setProjectPatterns={setProjectPatterns} isPlaying={isPlaying} activeStudioView={activeStudioView} bpm={bpm} playbackStartTime={playbackStartTime} currentUser={user} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}