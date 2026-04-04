import React, { useState, useEffect, useRef } from "react";
import Knob from "./common/Knob"; 
import { audioCtx, masterGain, recDestination } from "../utils/audioEngine"; 
import "../styles/topbar.css";

export default function TopBar({ 
  setCurrentView, activeView, currentUser, onLogout,
  isPlaying, setIsPlaying, bpm, setBpm, masterVolume, setMasterVolume, stepsCount,
  onUpgradeSuccess 
}) {
  const [time, setTime] = useState(0);
  const [exportStatus, setExportStatus] = useState("idle");
  const [showProModal, setShowProModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const bpmRef = useRef(bpm);
  const stepsCountRef = useRef(stepsCount);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { stepsCountRef.current = stepsCount; }, [stepsCount]);

  useEffect(() => {
    masterGain.gain.value = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    let animationFrameId;
    let lastTimestamp;
    let runningTime = 0; 

    const updateTimer = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      const stepTimeMs = (60 / bpmRef.current) * 1000 / 4;
      const loopDurationMs = stepTimeMs * stepsCountRef.current;

      runningTime += deltaTime;
      if (runningTime >= loopDurationMs) {
        runningTime = runningTime % loopDurationMs;
      }
      
      setTime(runningTime);
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    if (isPlaying) {
      lastTimestamp = performance.now(); 
      runningTime = 0; 
      animationFrameId = requestAnimationFrame(updateTimer);
    } else {
      setTime(0); 
      cancelAnimationFrame(animationFrameId);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  const formatTime = (ms) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor((ms % 1000) / 10); 
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(2, "0")}`;
  };

  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayUpgrade = async () => {
    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!res) { alert("Razorpay SDK failed to load."); return; }

    const token = localStorage.getItem("beatforge_token");
    if (!token) { alert("Please log in to upgrade."); return; }

    try {
      const orderResponse = await fetch("http://localhost:5000/api/create-razorpay-order", {
        method: "POST", headers: { "x-auth-token": token }
      });
      const orderData = await orderResponse.json();

      if (orderData.error) { alert("Failed to create order: " + orderData.error); return; }

      const options = {
        key: "rzp_test_SZ5twits0bDjky", 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "BeatForge Pro",
        description: "Lifetime Pro Access",
        order_id: orderData.id,
        handler: async function (response) {
          const verifyRes = await fetch("http://localhost:5000/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-auth-token": token },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            if (onUpgradeSuccess) onUpgradeSuccess();
            setShowSuccessModal(true);
          } else {
            alert("Payment verification failed.");
          }
        },
        prefill: { name: currentUser?.username || "Beatforge User", email: currentUser?.email || "" },
        theme: { color: "#a64aff" }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Payment initialization error:", error);
      alert("Something went wrong loading the payment gateway.");
    }
  };

  const handleExport = () => {
    if (!currentUser?.isPro) {
      setShowProModal(true);
      return;
    }

    if (exportStatus === "processing") return;
    setExportStatus("processing");

    if (audioCtx.state === 'suspended') audioCtx.resume();

    const loopDurationMs = ((60000 / bpm) / 4) * stepsCount;
    const recorder = new MediaRecorder(recDestination.stream);
    const chunks = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' }); 
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `BeatForge_${bpm}BPM.webm`;
      a.click();
      
      setExportStatus("ready");
      setTimeout(() => setExportStatus("idle"), 3000);
    };

    recorder.start();

    setIsPlaying(false);
    setTimeout(() => {
      setIsPlaying(true);
      
      setTimeout(() => {
        setIsPlaying(false);
        setTimeout(() => recorder.stop(), 500); 
      }, loopDurationMs);
      
    }, 50);
  };

  return (
    <>
      {/* Celebration Modal */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#141418', padding: '40px', borderRadius: '16px', border: '1px solid #00e676', textAlign: 'center', maxWidth: '400px', boxShadow: '0 15px 50px rgba(0, 230, 118, 0.2)' }}>
            <div style={{ fontSize: '50px', marginBottom: '15px' }}>🎉</div>
            <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '24px', fontFamily: 'var(--bf-font-display)' }}>
              WELCOME TO PRO
            </h2>
            <p style={{ color: '#aaa', fontSize: '15px', lineHeight: '1.5', marginBottom: '25px' }}>
              Your payment was successful. All premium kits, custom samples, and export features are now permanently unlocked.
            </p>
            <button 
              onClick={() => setShowSuccessModal(false)}
              style={{ width: '100%', background: '#00e676', color: '#000', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0, 230, 118, 0.3)' }}
            >
              START CREATING
            </button>
          </div>
        </div>
      )}

      {/* Sales Pitch Modal */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#141418', padding: '40px', borderRadius: '16px', border: '1px solid var(--accent)', textAlign: 'left', maxWidth: '450px', boxShadow: '0 15px 50px rgba(166, 74, 255, 0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '28px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--bf-font-display)' }}>
                  <span style={{ fontSize: '32px' }}>👑</span> BeatForge Pro
                </h2>
                <p style={{ color: 'var(--accent)', margin: 0, fontWeight: 'bold', letterSpacing: '1px', fontSize: '13px' }}>LIFETIME ACCESS</p>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '28px', lineHeight: 1, padding: 0 }}>&times;</button>
            </div>

            <div style={{ margin: '30px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                "Export studio-quality audio files directly to your device",
                "Upload and sequence your own custom .wav/.mp3 samples",
                "Unlock all premium drum kits (Techno, Dubstep, and more)",
              ].map((benefit, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: 'var(--text-light)', fontSize: '14.5px', lineHeight: '1.4' }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#00e676" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  {benefit}
                </div>
              ))}
            </div>

            <button 
              onClick={() => {
                setShowUpgradeModal(false);
                handleRazorpayUpgrade();
              }}
              style={{ 
                width: '100%', background: 'linear-gradient(45deg, #a64aff, #ff4aaa)', color: '#fff', 
                border: 'none', padding: '16px', borderRadius: '8px', fontWeight: '900', 
                fontSize: '16px', letterSpacing: '2px', cursor: 'pointer', 
                boxShadow: '0 10px 20px rgba(166, 74, 255, 0.4)', transition: 'transform 0.2s',
                fontFamily: 'var(--bf-font-ui)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              UPGRADE NOW — ₹499
            </button>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginTop: '15px', marginBottom: 0 }}>Secure one-time payment. No recurring subscriptions.</p>
          </div>
        </div>
      )}

      {/* Feature-Gate Modal */}
      {showProModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #333', textAlign: 'center', maxWidth: '350px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: '45px', marginBottom: '10px' }}>👑</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#FFD700', fontSize: '22px', letterSpacing: '1px' }}>PRO FEATURE</h3>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
              Exporting high-quality audio files is exclusive to Beatforge Pro.<br/><br/>
              Click the <strong style={{color: '#FFD700'}}>⭐ UNLOCK PRO</strong> button in the top bar to get lifetime access!
            </p>
            <button className="panel-btn" onClick={() => setShowProModal(false)} style={{ width: '100%', background: '#222', color: '#fff', cursor: 'pointer' }}>GOT IT</button>
          </div>
        </div>
      )}

      <div className="topbar">
        <div className="topbar-section left-section" style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <h2 
            className="brand-logo" 
            onClick={() => setCurrentView && setCurrentView('landing')} 
            style={{ cursor: 'pointer', margin: 0, fontSize: '1.3rem', color: 'var(--accent)', textShadow: '0 0 15px rgba(166, 74, 255, 0.4)' }}
          >
            BEATFORGE
          </h2>

          <div style={{ display: 'flex', gap: '15px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '20px' }}>
            <button 
              onClick={() => setCurrentView && setCurrentView('landing')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              HOME
            </button>
            
            <button 
              onClick={handleExport}
              disabled={exportStatus === "processing"}
              style={{ 
                background: exportStatus === 'ready' ? '#00e676' : 'rgba(255,255,255,0.05)', 
                border: exportStatus === 'ready' ? 'none' : '1px solid rgba(255,255,255,0.1)', 
                color: exportStatus === 'ready' ? '#000' : (currentUser?.isPro ? 'var(--text-light)' : '#FFD700'), 
                cursor: exportStatus === 'processing' ? 'wait' : 'pointer', 
                fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', 
                padding: '6px 12px', borderRadius: '4px', transition: 'all 0.2s', marginLeft: '10px',
                letterSpacing: '1px', textShadow: 'none'
              }}
            >
              {exportStatus === "idle" && (
                currentUser?.isPro ? (
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                ) : (
                  <span style={{ fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', transform: 'translateY(-1px)' }}>👑</span>
                )
              )}
              {exportStatus === "idle" ? (currentUser?.isPro ? "EXPORT AUDIO" : "EXPORT PRO") : exportStatus === "processing" ? "RENDERING..." : "✔️ EXPORT READY"}
            </button>
          </div>
        </div>
        
        <div className="topbar-section center-section">
          <div className="transport-group">
            <button className={`transport-btn ${isPlaying ? "playing" : ""}`} onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button className="transport-btn stop-btn" onClick={() => setIsPlaying(false)}>⏹</button>
          </div>
          <div className="transport-divider"></div>
          <div className="led-timer" 
            style={{
              background: '#0a0a0c', border: '1px solid #1f1f23', padding: '6px 16px', borderRadius: '6px',
              fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold',
              color: isPlaying ? '#ff4757' : '#555', textShadow: isPlaying ? '0 0 10px rgba(255, 71, 87, 0.6)' : 'none',
              letterSpacing: '2px', minWidth: '115px', textAlign: 'center',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)', transition: 'color 0.2s, text-shadow 0.2s'
            }}
          >
            {formatTime(time)}
          </div>
          <div className="transport-divider"></div>
          <div className="master-controls">
            <Knob label="BPM" value={bpm} min={40} max={250} onChange={setBpm} />
            <Knob label="MASTER" value={masterVolume * 100} min={0} max={100} onChange={(v) => setMasterVolume(v / 100)} />
          </div>
        </div>

        <div className="topbar-section right-section" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {!currentUser?.isPro && (
            <button onClick={() => setShowUpgradeModal(true)}
              style={{
                background: 'linear-gradient(45deg, #FFD700, #FFA500)', color: '#000', border: 'none',
                padding: '6px 14px', borderRadius: '4px', fontWeight: '900', fontSize: '12px',
                letterSpacing: '1px', cursor: 'pointer', marginRight: '15px', boxShadow: '0 0 10px rgba(255, 165, 0, 0.4)'
              }}
            >⭐ UNLOCK PRO</button>
          )}

          <div className="user-profile" title="Current Producer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="user-icon">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="username" style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {currentUser?.username || "Guest"}
              {currentUser?.isPro && (
                <span style={{ background: '#a64aff', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>PRO</span>
              )}
            </span>
          </div>

          <button className="icon-btn logout-btn" onClick={onLogout} title="Log Out"
            style={{ 
              background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', border: '1px solid rgba(255, 71, 87, 0.2)',
              padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            LOGOUT
          </button>
        </div>
      </div>
    </>
  );
}