import React, { useRef, useEffect, useState } from "react";
import "../styles/sidebar.css";

export default function Sidebar({ setCurrentView, activeStudioView, setActiveStudioView, mySamples, setMySamples, currentUser }) {
  const audioPreviewRef = useRef(new Audio());
  const fileInputRef = useRef(null);
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    if (!currentUser) { setMySamples([]); return; }
    const fetchCloudSamples = async () => {
      try {
        const token = localStorage.getItem("beatforge_token");
        const res = await fetch("http://localhost:5000/api/samples", { headers: { "x-auth-token": token } });
        if (res.ok) {
          const data = await res.json();
          setMySamples(data);
        }
      } catch (error) { console.error("Failed to load cloud samples:", error); }
    };
    fetchCloudSamples();
  }, [currentUser, setMySamples]);

  const handleSampleUpload = async (e) => {
    if (!currentUser || !currentUser.isPro) {
      setShowProModal(true);
      e.target.value = null; 
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // 🌟 NEW: Strict File Validation Bouncer (Sidebar Edition)
    // Protects your database from storing corrupted or unsupported files!
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/x-wav'];
    const validExtensions = ['.wav', '.mp3', '.ogg'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      alert("⚠️ Invalid file format!\n\nPlease upload only .wav, .mp3, or .ogg files.");
      e.target.value = null; // Clear the input
      return;
    }

    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("name", cleanName);

    try {
      const token = localStorage.getItem("beatforge_token");
      const res = await fetch("http://localhost:5000/api/samples", {
        method: "POST", headers: { "x-auth-token": token }, body: formData
      });
      if (res.ok) {
        const savedSample = await res.json();
        setMySamples((prev) => [savedSample, ...prev]);
      } else { console.error("Upload failed."); }
    } catch (error) { console.error("Error uploading sample:", error); }

    e.target.value = null; 
  };

  const playPreview = (fileUrl) => {
    audioPreviewRef.current.src = fileUrl;
    audioPreviewRef.current.currentTime = 0;
    audioPreviewRef.current.play().catch(err => console.log("Preview blocked:", err));
  };

  const deleteSample = async (id, e) => {
    e.stopPropagation(); 
    try {
      const token = localStorage.getItem("beatforge_token");
      const res = await fetch(`http://localhost:5000/api/samples/${id}`, {
        method: "DELETE", headers: { "x-auth-token": token }
      });
      if (res.ok) {
        setMySamples((prev) => prev.filter(sample => sample.id !== id));
      } else { alert("Failed to delete sample from the server."); }
    } catch (error) { console.error("Error deleting sample:", error); }
  };

  return (
    <>
      {showProModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #333', textAlign: 'center', maxWidth: '350px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: '45px', marginBottom: '10px' }}>👑</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#FFD700', fontSize: '22px', letterSpacing: '1px' }}>PRO FEATURE</h3>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
              Custom Sample Uploads are exclusive to Beatforge Pro.<br/><br/>
              Click the <strong style={{color: '#FFD700'}}>⭐ UNLOCK PRO</strong> button in the top bar to get lifetime access!
            </p>
            <button className="panel-btn" onClick={() => setShowProModal(false)} style={{ width: '100%', background: '#222', color: '#fff' }}>GOT IT</button>
          </div>
        </div>
      )}

      {/* 🌟 Added paddingTop so it doesn't hit the absolute top edge now that the logo is gone */}
      <div className="sidebar" style={{ paddingTop: '20px' }}>
        
        <div className="sidebar-nav">
          <div className="browser-title" style={{ marginBottom: '8px', paddingLeft: '4px' }}>WORKSPACE</div>
          <div className={`nav-item ${activeStudioView === 'sequencer' ? 'active' : ''}`} onClick={() => setActiveStudioView('sequencer')}>
            <div className="nav-item-left"><span>🥁</span> Step Sequencer</div>
          </div>
          <div className={`nav-item ${activeStudioView === 'beatmaker' ? 'active' : ''}`} onClick={() => setActiveStudioView('beatmaker')}>
            <div className="nav-item-left"><span>🎹</span> Piano Roll</div>
          </div>
          <div className={`nav-item ${activeStudioView === 'livepad' ? 'active' : ''}`} onClick={() => setActiveStudioView('livepad')}>
            <div className="nav-item-left"><span>🎛️</span> Live Pad</div>
          </div>
        </div>

        <div className="sidebar-browser">
          <div className="browser-header">
            <div className="browser-title">MY SAMPLES</div>
            <button className="upload-btn" onClick={() => { if (currentUser?.isPro) { fileInputRef.current.click(); } else { setShowProModal(true); } }} 
              title={currentUser?.isPro ? "Upload Sample" : "Upload Sample (PRO Required)"}
              style={{ color: currentUser?.isPro ? 'inherit' : '#FFD700', borderColor: currentUser?.isPro ? 'inherit' : 'rgba(255, 215, 0, 0.4)' }}>
              {currentUser?.isPro ? "+" : "👑"}
            </button>
            {/* 🌟 FIX: Updated the accept attribute to only allow specific audio files */}
            <input type="file" accept=".wav,.mp3,.ogg,audio/wav,audio/mpeg,audio/ogg" ref={fileInputRef} style={{ display: 'none' }} onChange={handleSampleUpload} />
          </div>

          <div className="sample-list">
            {mySamples.length === 0 ? (
              <div className="empty-browser">No custom samples yet.<br/>Click {currentUser?.isPro ? "'+'" : "'👑'"} to upload .wav/.mp3</div>
            ) : (
              mySamples.map((sample) => (
                <div key={sample.id} className="sample-item" onClick={() => playPreview(sample.file)}>
                  <span className="sample-name" title={sample.name}>🎵 {sample.name}</span>
                  <button className="delete-btn" onClick={(e) => deleteSample(sample.id, e)} title="Delete Sample">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}