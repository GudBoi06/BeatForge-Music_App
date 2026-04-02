import React, { useRef, useEffect } from "react";
import "../styles/sidebar.css";

export default function Sidebar({ setCurrentView, activeStudioView, setActiveStudioView, mySamples, setMySamples, currentUser }) {
  
  const audioPreviewRef = useRef(new Audio());
  const fileInputRef = useRef(null);

  // 🌩️ PULL SAMPLES FROM MONGODB ON LOGIN
  useEffect(() => {
    if (!currentUser) {
      setMySamples([]); // Wipe if logged out
      return;
    }

    const fetchCloudSamples = async () => {
      try {
        const token = localStorage.getItem("beatforge_token");
        const res = await fetch("http://localhost:5000/api/samples", {
          headers: { "x-auth-token": token }
        });

        if (res.ok) {
          const data = await res.json();
          setMySamples(data);
        }
      } catch (error) {
        console.error("Failed to load cloud samples:", error);
      }
    };

    fetchCloudSamples();
  }, [currentUser, setMySamples]);


  // 🚀 UPLOAD ACTUAL FILE TO NODE.JS BACKEND
  const handleSampleUpload = async (e) => {
    if (!currentUser) {
      alert("You must be logged in to upload custom samples.");
      e.target.value = null; 
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const cleanName = file.name.replace(/\.[^/.]+$/, "");

    // 📦 Package the file into a special FormData object for transmission
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("name", cleanName);

    try {
      const token = localStorage.getItem("beatforge_token");
      
      // 📡 Send it to the Multer route we just built!
      const res = await fetch("http://localhost:5000/api/samples", {
        method: "POST",
        headers: { "x-auth-token": token }, // NO Content-Type header! The browser sets it automatically for FormData
        body: formData
      });

      if (res.ok) {
        const savedSample = await res.json();
        // Add the permanent server URL to our Sidebar list
        setMySamples((prev) => [savedSample, ...prev]);
      } else {
        alert("Upload failed. Make sure your backend server is running!");
      }
    } catch (error) {
      console.error("Error uploading sample:", error);
    }

    e.target.value = null; 
  };

  const playPreview = (fileUrl) => {
    audioPreviewRef.current.src = fileUrl;
    audioPreviewRef.current.currentTime = 0;
    audioPreviewRef.current.play().catch(err => console.log("Preview blocked:", err));
  };

  const deleteSample = (id, e) => {
    e.stopPropagation(); 
    // In the future, you can add a fetch() here to delete the file from the /uploads folder too!
    setMySamples((prev) => prev.filter(sample => sample.id !== id));
  };

  return (
    <div className="sidebar">
      
      {/* HEADER */}
      <div className="sidebar-header">
        <h2 className="brand-logo" onClick={() => setCurrentView('landing')} style={{ cursor: 'pointer' }}>
          BEATFORGE
        </h2>
      </div>

      {/* NAVIGATION TABS */}
      <div className="sidebar-nav">
        <div className="browser-title" style={{ marginBottom: '8px', paddingLeft: '4px' }}>WORKSPACE</div>
        
        <div 
          className={`nav-item ${activeStudioView === 'sequencer' ? 'active' : ''}`}
          onClick={() => setActiveStudioView('sequencer')}
        >
          <div className="nav-item-left">
            <span>🥁</span> Step Sequencer
          </div>
        </div>
        
        <div 
          className={`nav-item ${activeStudioView === 'beatmaker' ? 'active' : ''}`}
          onClick={() => setActiveStudioView('beatmaker')}
        >
          <div className="nav-item-left">
            <span>🎹</span> Piano Roll
          </div>
        </div>

        {/* 🎛️ THE NEW LIVE PAD BUTTON */}
        <div 
          className={`nav-item ${activeStudioView === 'livepad' ? 'active' : ''}`}
          onClick={() => setActiveStudioView('livepad')}
        >
          <div className="nav-item-left">
            <span>🎛️</span> Live Pad
          </div>
        </div>
      </div>

      {/* 📂 THE BROWSER (MY SAMPLES) */}
      <div className="sidebar-browser">
        <div className="browser-header">
          <div className="browser-title">MY SAMPLES</div>
          
          <button className="upload-btn" onClick={() => fileInputRef.current.click()} title="Upload Sample">
            +
          </button>
          <input 
            type="file" 
            accept="audio/*" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleSampleUpload} 
          />
        </div>

        {/* Sample List */}
        <div className="sample-list">
          {mySamples.length === 0 ? (
            <div className="empty-browser">
              No custom samples yet.<br/>Click '+' to upload .wav/.mp3
            </div>
          ) : (
            mySamples.map((sample) => (
              <div 
                key={sample.id} 
                className="sample-item"
                onClick={() => playPreview(sample.file)}
              >
                <span className="sample-name" title={sample.name}>
                  🎵 {sample.name}
                </span>
                
                <button 
                  className="delete-btn"
                  onClick={(e) => deleteSample(sample.id, e)}
                  title="Delete Sample"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  );
}