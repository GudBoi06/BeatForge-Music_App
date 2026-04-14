import React, { useRef, useEffect, useState } from "react";
import "../styles/sidebar.css";

const VALID_TYPES = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/x-wav"];
const VALID_EXTS  = [".wav", ".mp3", ".ogg"];
const NAV_ITEMS   = [
  { view: "sequencer", icon: "🥁", label: "Step Sequencer" },
  { view: "beatmaker", icon: "🎹", label: "Piano Roll"     },
  { view: "livepad",   icon: "🎛️", label: "Live Pad"       },
];

const token = () => localStorage.getItem("beatforge_token");

export default function Sidebar({ activeStudioView, setActiveStudioView, mySamples, setMySamples, currentUser }) {
  const audioRef    = useRef(new Audio());
  const fileInputRef = useRef(null);
  const [showProModal, setShowProModal] = useState(false);

  // Load cloud samples on login
  useEffect(() => {
    if (!currentUser) { setMySamples([]); return; }
    fetch("http://localhost:5000/api/samples", { headers: { "x-auth-token": token() } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setMySamples)
      .catch(() => console.error("Failed to load cloud samples."));
  }, [currentUser, setMySamples]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!currentUser?.isPro) { setShowProModal(true); return; }
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!VALID_TYPES.includes(file.type) && !VALID_EXTS.includes(ext)) {
      alert("⚠️ Invalid file format!\n\nPlease upload only .wav, .mp3, or .ogg files.");
      return;
    }

    const form = new FormData();
    form.append("audio", file);
    form.append("name", file.name.replace(/\.[^/.]+$/, ""));

    fetch("http://localhost:5000/api/samples", { method: "POST", headers: { "x-auth-token": token() }, body: form })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((saved) => setMySamples((prev) => [saved, ...prev]))
      .catch(() => console.error("Upload failed."));
  };

  const deleteSample = (id, e) => {
    e.stopPropagation();
    fetch(`http://localhost:5000/api/samples/${id}`, { method: "DELETE", headers: { "x-auth-token": token() } })
      .then((r) => r.ok ? setMySamples((prev) => prev.filter((s) => s.id !== id)) : alert("Failed to delete sample from the server."))
      .catch(() => console.error("Error deleting sample."));
  };

  const isPro = currentUser?.isPro;

  return (
    <>
      {showProModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#111", padding: 30, borderRadius: 12, border: "1px solid #333", textAlign: "center", maxWidth: 350, boxShadow: "0 10px 40px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize: 45, marginBottom: 10 }}>👑</div>
            <h3 style={{ margin: "0 0 12px", color: "#FFD700", fontSize: 22, letterSpacing: 1 }}>PRO FEATURE</h3>
            <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              Custom Sample Uploads are exclusive to Beatforge Pro.<br /><br />
              Click the <strong style={{ color: "#FFD700" }}>⭐ UNLOCK PRO</strong> button in the top bar to get lifetime access!
            </p>
            <button className="panel-btn" onClick={() => setShowProModal(false)} style={{ width: "100%", background: "#222", color: "#fff" }}>GOT IT</button>
          </div>
        </div>
      )}

      <div className="sidebar" style={{ paddingTop: 20 }}>

        <div className="sidebar-nav">
          <div className="browser-title" style={{ marginBottom: 8, paddingLeft: 4 }}>WORKSPACE</div>
          {NAV_ITEMS.map(({ view, icon, label }) => (
            <div key={view} className={`nav-item ${activeStudioView === view ? "active" : ""}`} onClick={() => setActiveStudioView(view)}>
              <div className="nav-item-left"><span>{icon}</span> {label}</div>
            </div>
          ))}
        </div>

        <div className="sidebar-browser">
          <div className="browser-header">
            <div className="browser-title">MY SAMPLES</div>
            <button className="upload-btn" title={isPro ? "Upload Sample" : "Upload Sample (PRO Required)"}
              onClick={() => isPro ? fileInputRef.current.click() : setShowProModal(true)}
              style={{ color: isPro ? "inherit" : "#FFD700", borderColor: isPro ? "inherit" : "rgba(255,215,0,0.4)" }}>
              {isPro ? "+" : "👑"}
            </button>
            <input type="file" accept=".wav,.mp3,.ogg,audio/wav,audio/mpeg,audio/ogg" ref={fileInputRef} style={{ display: "none" }} onChange={handleUpload} />
          </div>

          <div className="sample-list">
            {mySamples.length === 0 ? (
              <div className="empty-browser">No custom samples yet.<br />Click {isPro ? "'+'" : "'👑'"} to upload .wav/.mp3</div>
            ) : mySamples.map((sample) => (
              <div key={sample.id} className="sample-item" onClick={() => { audioRef.current.src = sample.file; audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }}>
                <span className="sample-name" title={sample.name}>🎵 {sample.name}</span>
                <button className="delete-btn" onClick={(e) => deleteSample(sample.id, e)} title="Delete Sample">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}