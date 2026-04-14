import React, { useState, useEffect, useRef } from "react";
import Knob from "./common/Knob";
import { audioCtx, masterGain, recDestination } from "../utils/audioEngine";
import "../styles/topbar.css";

/* ─── MODAL ─────────────────────────────────────────────────── */
function Modal({ onClose, children, borderColor = "#333", glowColor = "rgba(0,0,0,0.8)" }) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#141418", padding: "40px", borderRadius: "16px", border: `1px solid ${borderColor}`, maxWidth: "450px", width: "100%", boxShadow: `0 15px 50px ${glowColor}`, position: "relative" }}>
        {onClose && (
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "24px", lineHeight: 1 }}>&times;</button>
        )}
        {children}
      </div>
    </div>
  );
}

/* ─── ICONS ─────────────────────────────────────────────────── */
const HomeIcon   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ExportIcon = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const UserIcon   = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const LogoutIcon = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const CheckIcon  = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#00e676" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

const PRO_BENEFITS = [
  "Export studio-quality audio files directly to your device",
  "Upload and sequence your own custom .wav/.mp3 samples",
  "Unlock all premium drum kits (Techno, Dubstep, and more)",
];

/* ─── MAIN TOPBAR ────────────────────────────────────────────── */
export default function TopBar({
  setCurrentView, currentUser, onLogout,
  isPlaying, setIsPlaying, bpm, setBpm, masterVolume, setMasterVolume, stepsCount,
  onUpgradeSuccess,
}) {
  const [time, setTime]                     = useState(0);
  const [exportStatus, setExportStatus]     = useState("idle");
  const [showProModal, setShowProModal]     = useState(false);
  const [showUpgradeModal, setShowUpgrade]  = useState(false);
  const [showSuccessModal, setShowSuccess]  = useState(false);

  const bpmRef       = useRef(bpm);
  const stepsRef     = useRef(stepsCount);

  useEffect(() => { bpmRef.current = bpm; },         [bpm]);
  useEffect(() => { stepsRef.current = stepsCount; }, [stepsCount]);
  useEffect(() => { masterGain.gain.value = masterVolume; }, [masterVolume]);

  // Timer animation
  useEffect(() => {
    let rafId, lastTs, running = 0;
    const tick = (ts) => {
      if (!lastTs) lastTs = ts;
      const delta = ts - lastTs; lastTs = ts;
      const loopMs = ((60 / bpmRef.current) * 1000 / 4) * stepsRef.current;
      running = (running + delta) % loopMs;
      setTime(running);
      rafId = requestAnimationFrame(tick);
    };
    if (isPlaying) { lastTs = null; running = 0; rafId = requestAnimationFrame(tick); }
    else { setTime(0); }
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const formatTime = (ms) => {
    const m  = Math.floor(ms / 60000).toString().padStart(2, "0");
    const s  = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
    const cs = Math.floor((ms % 1000) / 10).toString().padStart(2, "0");
    return `${m}:${s}.${cs}`;
  };

  const loadScript = (src) => new Promise((res) => {
    const s = document.createElement("script");
    s.src = src; s.onload = () => res(true); s.onerror = () => res(false);
    document.body.appendChild(s);
  });

  const handleRazorpayUpgrade = async () => {
    const loaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!loaded) { alert("Razorpay SDK failed to load."); return; }
    const token = localStorage.getItem("beatforge_token");
    if (!token)  { alert("Please log in to upgrade."); return; }

    try {
      const orderData = await fetch("http://localhost:5000/api/create-razorpay-order", {
        method: "POST", headers: { "x-auth-token": token },
      }).then((r) => r.json());

      if (orderData.error) { alert("Failed to create order: " + orderData.error); return; }

      new window.Razorpay({
        key: "rzp_test_SZ5twits0bDjky",
        amount: orderData.amount, currency: orderData.currency,
        name: "BeatForge Pro", description: "Lifetime Pro Access",
        order_id: orderData.id,
        handler: async ({ razorpay_payment_id, razorpay_order_id, razorpay_signature }) => {
          const { success } = await fetch("http://localhost:5000/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-auth-token": token },
            body: JSON.stringify({ razorpay_payment_id, razorpay_order_id, razorpay_signature }),
          }).then((r) => r.json());
          if (success) { onUpgradeSuccess?.(); setShowSuccess(true); }
          else alert("Payment verification failed.");
        },
        prefill: { name: currentUser?.username || "Beatforge User", email: currentUser?.email || "" },
        theme: { color: "#a64aff" },
      }).open();
    } catch (e) {
      console.error("Payment initialization error:", e);
      alert("Something went wrong loading the payment gateway.");
    }
  };

  const handleExport = () => {
    if (!currentUser?.isPro) { setShowProModal(true); return; }
    if (exportStatus === "processing") return;
    setExportStatus("processing");

    if (audioCtx.state === "suspended") audioCtx.resume();
    const loopMs   = ((60000 / bpm) / 4) * stepsCount;
    const recorder = new MediaRecorder(recDestination.stream);
    const chunks   = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: "audio/webm" }));
      Object.assign(document.createElement("a"), { href: url, download: `BeatForge_${bpm}BPM.webm` }).click();
      setExportStatus("ready");
      setTimeout(() => setExportStatus("idle"), 3000);
    };

    recorder.start();
    setIsPlaying(false);
    setTimeout(() => {
      setIsPlaying(true);
      setTimeout(() => { setIsPlaying(false); setTimeout(() => recorder.stop(), 500); }, loopMs);
    }, 50);
  };

  const navBtn = (label, onClick) => (
    <button onClick={onClick}
      style={{ background: "transparent", border: "none", color: "var(--text-light)", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px", transition: "color 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-light)")}
    >{label}</button>
  );

  return (
    <>
      {/* ── SUCCESS MODAL ── */}
      {showSuccessModal && (
        <Modal borderColor="#00e676" glowColor="rgba(0,230,118,0.2)">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 50, marginBottom: 15 }}>🎉</div>
            <h2 style={{ margin: "0 0 10px", color: "#fff", fontSize: 24, fontFamily: "var(--bf-font-display)" }}>WELCOME TO PRO</h2>
            <p style={{ color: "#aaa", fontSize: 15, lineHeight: 1.5, marginBottom: 25 }}>Your payment was successful. All premium kits, custom samples, and export features are now permanently unlocked.</p>
            <button onClick={() => setShowSuccess(false)} style={{ width: "100%", background: "#00e676", color: "#000", border: "none", padding: 14, borderRadius: 8, fontWeight: "bold", fontSize: 15, letterSpacing: 1, cursor: "pointer" }}>START CREATING</button>
          </div>
        </Modal>
      )}

      {/* ── UPGRADE MODAL ── */}
      {showUpgradeModal && (
        <Modal onClose={() => setShowUpgrade(false)} borderColor="var(--accent)" glowColor="rgba(166,74,255,0.2)">
          <h2 style={{ margin: "0 0 4px", color: "#fff", fontSize: 28, display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--bf-font-display)" }}>
            <span style={{ fontSize: 32 }}>👑</span> BeatForge Pro
          </h2>
          <p style={{ color: "var(--accent)", margin: "0 0 24px", fontWeight: "bold", letterSpacing: 1, fontSize: 13 }}>LIFETIME ACCESS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
            {PRO_BENEFITS.map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 12, color: "var(--text-light)", fontSize: 14.5, lineHeight: 1.4 }}>
                <CheckIcon /> {b}
              </div>
            ))}
          </div>
          <button
            onClick={() => { setShowUpgrade(false); handleRazorpayUpgrade(); }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            style={{ width: "100%", background: "linear-gradient(45deg,#a64aff,#ff4aaa)", color: "#fff", border: "none", padding: 16, borderRadius: 8, fontWeight: 900, fontSize: 16, letterSpacing: 2, cursor: "pointer", transition: "transform 0.2s", fontFamily: "var(--bf-font-ui)" }}
          >UPGRADE NOW — ₹499</button>
          <p style={{ textAlign: "center", color: "#666", fontSize: 12, marginTop: 15, marginBottom: 0 }}>Secure one-time payment. No recurring subscriptions.</p>
        </Modal>
      )}

      {/* ── FEATURE-GATE MODAL ── */}
      {showProModal && (
        <Modal borderColor="#333" glowColor="rgba(0,0,0,0.8)">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 45, marginBottom: 10 }}>👑</div>
            <h3 style={{ margin: "0 0 12px", color: "#FFD700", fontSize: 22, letterSpacing: 1 }}>PRO FEATURE</h3>
            <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              Exporting high-quality audio files is exclusive to Beatforge Pro.<br /><br />
              Click the <strong style={{ color: "#FFD700" }}>⭐ UNLOCK PRO</strong> button in the top bar to get lifetime access!
            </p>
            <button className="panel-btn" onClick={() => setShowProModal(false)} style={{ width: "100%", background: "#222", color: "#fff", cursor: "pointer" }}>GOT IT</button>
          </div>
        </Modal>
      )}

      {/* ── TOPBAR ── */}
      <div className="topbar">

        {/* LEFT */}
        <div className="topbar-section left-section" style={{ display: "flex", alignItems: "center", gap: 25 }}>
          <h2 className="brand-logo" onClick={() => setCurrentView?.("landing")}
            style={{ cursor: "pointer", margin: 0, fontSize: "1.3rem", color: "var(--accent)", textShadow: "0 0 15px rgba(166,74,255,0.4)" }}>
            BEATFORGE
          </h2>
          <div style={{ display: "flex", gap: 15, borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 20 }}>
            {navBtn(<><HomeIcon /> HOME</>, () => setCurrentView?.("landing"))}
            <button onClick={handleExport} disabled={exportStatus === "processing"}
              style={{
                background: exportStatus === "ready" ? "#00e676" : "rgba(255,255,255,0.05)",
                border:     exportStatus === "ready" ? "none" : "1px solid rgba(255,255,255,0.1)",
                color:      exportStatus === "ready" ? "#000" : (currentUser?.isPro ? "var(--text-light)" : "#FFD700"),
                cursor: exportStatus === "processing" ? "wait" : "pointer",
                fontSize: "0.75rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 4, transition: "all 0.2s", marginLeft: 10, letterSpacing: 1,
              }}>
              {exportStatus === "idle"       && (currentUser?.isPro ? <ExportIcon /> : <span style={{ fontSize: 14 }}>👑</span>)}
              {exportStatus === "idle"       ? (currentUser?.isPro ? "EXPORT AUDIO" : "EXPORT PRO") :
               exportStatus === "processing" ? "RENDERING..." : "✔️ EXPORT READY"}
            </button>
          </div>
        </div>

        {/* CENTER */}
        <div className="topbar-section center-section">
          <div className="transport-group">
            <button className={`transport-btn ${isPlaying ? "playing" : ""}`} onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button className="transport-btn stop-btn" onClick={() => setIsPlaying(false)}>⏹</button>
          </div>
          <div className="transport-divider" />
          <div className="led-timer" style={{
            background: "#0a0a0c", border: "1px solid #1f1f23", padding: "6px 16px", borderRadius: 6,
            fontFamily: "monospace", fontSize: 18, fontWeight: "bold",
            color: isPlaying ? "#ff4757" : "#555", textShadow: isPlaying ? "0 0 10px rgba(255,71,87,0.6)" : "none",
            letterSpacing: 2, minWidth: 115, textAlign: "center",
            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)", transition: "color 0.2s, text-shadow 0.2s",
          }}>
            {formatTime(time)}
          </div>
          <div className="transport-divider" />
          <div className="master-controls">
            <Knob label="BPM"    value={bpm}                min={40} max={250} onChange={setBpm} />
            <Knob label="MASTER" value={masterVolume * 100} min={0}  max={100} onChange={(v) => setMasterVolume(v / 100)} />
          </div>
        </div>

        {/* RIGHT */}
        <div className="topbar-section right-section" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {!currentUser?.isPro && (
            <button onClick={() => setShowUpgrade(true)}
              style={{ background: "linear-gradient(45deg,#FFD700,#FFA500)", color: "#000", border: "none", padding: "6px 14px", borderRadius: 4, fontWeight: 900, fontSize: 12, letterSpacing: 1, cursor: "pointer", marginRight: 15, boxShadow: "0 0 10px rgba(255,165,0,0.4)" }}>
              ⭐ UNLOCK PRO
            </button>
          )}
          <div className="user-profile" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-light)" }}>
            <UserIcon />
            <span style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              {currentUser?.username || "Guest"}
              {currentUser?.isPro && <span style={{ background: "#a64aff", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>PRO</span>}
            </span>
          </div>
          <button className="icon-btn logout-btn" onClick={onLogout} title="Log Out"
            style={{ background: "rgba(255,71,87,0.1)", color: "#ff4757", border: "1px solid rgba(255,71,87,0.2)", padding: "8px 16px", borderRadius: 6, fontWeight: "bold", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <LogoutIcon /> LOGOUT
          </button>
        </div>

      </div>
    </>
  );
}