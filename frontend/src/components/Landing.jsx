import React, { useState, useEffect, useRef } from "react";
import "../styles/landing.css";

/* ─── FAQ DATA ─────────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: "Is BeatForge completely free to use?",
    a: "Yes, you can use the core BeatForge studio for free, forever! If you want to unlock advanced features like audio exports and custom samples, you can grab a lifetime BeatForge Pro license for a single, one-time payment.",
  },
  {
    q: "Do I need music production experience?",
    a: "Not at all. BeatForge is designed specifically for beginners. The interface is visual and intuitive, so you can start making beats on your first visit.",
  },
  {
    q: "Can I upload my own audio samples?",
    a: "Absolutely. BeatForge supports custom audio sample uploads in common formats (WAV, MP3, OGG). Just upload your file into the sample slot and start sequencing.",
  },
  {
    q: "What browsers are supported?",
    a: "BeatForge works on any modern browser — Chrome, Firefox, Edge, and Brave. For the best audio performance, we recommend Chrome or Brave.",
  },
  {
    q: "Can I save and export my beats?",
    a: "Yes. You can export your finished beats as audio files directly from the studio. Log in from anywhere and your studio will be exactly how you left it.",
  },
  {
    q: "Is BeatForge inspired by professional DAWs?",
    a: "Yes — BeatForge takes inspiration from FL Studio and Ableton, bringing their core workflow patterns into a simplified, accessible, browser-native experience.",
  },
];

/* ─── FEATURES DATA ─────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="8" width="3" height="8" rx="1" /><rect x="7" y="5" width="3" height="11" rx="1" />
        <rect x="12" y="8" width="3" height="8" rx="1" /><rect x="17" y="3" width="3" height="13" rx="1" />
      </svg>
    ),
    title: "32 Grid Step Sequencer",
    desc: "FL Studio–style step grid for building drum patterns, basslines, and melodic phrases with precision.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
        <line x1="12" y1="3" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="21" />
        <line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
      </svg>
    ),
    title: "Live Pad",
    desc: "Trigger samples in real time using a velocity-sensitive grid pad — perform live or record into the sequencer.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Melody Maker",
    desc: "Build melodic patterns on a piano-roll inspired keyboard grid. Supports custom scales and chord assistance.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    title: "BPM Control",
    desc: "Fine-tune your tempo from 40 to 300 BPM with a real-time dial. Tap-to-set BPM included for live feel.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: "Upload Samples",
    desc: "Drop in your own WAV or MP3 files and sequence them instantly. Your sounds, your beats, your identity.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 9l4-4 4 4" /><path d="M9 5v14" /><path d="M19 15l-4 4-4-4" /><path d="M15 19V5" />
      </svg>
    ),
    title: "High-Quality Audio Export",
    desc: "Instantly export your beats as high-fidelity audio files, ready to share or drop into any project.",
  }
];

/* ─── HELPERS ────────────────────────────────────────────────── */
function scrollTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const nav = document.querySelector(".landing-nav");
  const navHeight = nav ? nav.offsetHeight : 70;
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 12;
  window.scrollTo({ top, behavior: "smooth" });
}

/* ─── ANIMATED WAVEFORM BARS ─────────────────────────────────── */
function WaveBars({ count = 12, color = "var(--bf-accent)" }) {
  return (
    <div className="bf-wave-bars" style={{ "--bar-color": color }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="bf-wave-bar" style={{ animationDelay: `${(i * 0.08).toFixed(2)}s` }} />
      ))}
    </div>
  );
}

/* ─── SECTION WRAPPER ────────────────────────────────────────── */
function Section({ id, children, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id={id}
      ref={ref}
      className={`bf-section ${className} ${visible ? "bf-section--visible" : ""}`}
    >
      {children}
    </section>
  );
}

/* ─── FAQ ACCORDION ──────────────────────────────────────────── */
function FaqItem({ item, open, onToggle }) {
  return (
    <div className={`faq-item ${open ? "faq-item--open" : ""}`} onClick={onToggle}>
      <div className="faq-question">
        <span>{item.q}</span>
        <svg className="faq-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div className="faq-answer">
        <p>{item.a}</p>
      </div>
    </div>
  );
}

/* ─── CONTACT FORM ───────────────────────────────────────────── */
function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) setSent(true);
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message. Please try again later.");
    }
    setLoading(false);
  };

  if (sent)
    return (
      <div className="form-success">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="var(--bf-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <h3>Message Received</h3>
        <p>We'll get back to you within 24 hours.</p>
      </div>
    );

  return (
    <form className="bf-form" onSubmit={handleSubmit}>
      <div className="bf-form__row">
        <div className="bf-form__field">
          <label>Full Name</label>
          <input type="text" placeholder="Your name" value={form.name} onChange={update("name")} required />
        </div>
        <div className="bf-form__field">
          <label>Email Address</label>
          <input type="email" placeholder="you@email.com" value={form.email} onChange={update("email")} required />
        </div>
      </div>
      <div className="bf-form__field">
        <label>Subject</label>
        <select value={form.subject} onChange={update("subject")} required>
          <option value="" disabled>Select a topic…</option>
          <option>General Inquiry</option>
          <option>Bug Report</option>
          <option>Feature Request</option>
          <option>Account &amp; Billing</option>
          <option>Other</option>
        </select>
      </div>
      <div className="bf-form__field">
        <label>Message</label>
        <textarea rows={5} placeholder="Describe your issue or question…" value={form.message} onChange={update("message")} required />
      </div>
      <button type="submit" className="launch-btn" style={{ alignSelf: "flex-start" }} disabled={loading}>
        {loading ? "Sending..." : "Send Message"}
        {!loading && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
      </button>
    </form>
  );
}

/* ─── FEEDBACK FORM ──────────────────────────────────────────── */
function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [form, setForm] = useState({ category: "", comment: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, ...form })
      });
      if (res.ok) setSent(true);
    } catch (err) {
      console.error("Failed to send feedback", err);
      alert("Failed to send feedback. Please try again later.");
    }
    setLoading(false);
  };

  if (sent)
    return (
      <div className="form-success">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="var(--bf-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
          <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
        </svg>
        <h3>Thanks for the Feedback!</h3>
        <p>Your response helps us make BeatForge better for everyone.</p>
      </div>
    );

  return (
    <form className="bf-form" onSubmit={handleSubmit}>
      <div className="bf-form__field">
        <label>How would you rate your experience?</label>
        <div className="star-row">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              type="button"
              key={s}
              className={`star-btn ${s <= (hovered || rating) ? "star-btn--active" : ""}`}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(s)}
            >
              ★
            </button>
          ))}
          {rating > 0 && (
            <span className="star-label">
              {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
            </span>
          )}
        </div>
      </div>
      <div className="bf-form__field">
        <label>Category</label>
        <select value={form.category} onChange={update("category")} required>
          <option value="" disabled>What are you rating?</option>
          <option>Overall Experience</option>
          <option>Step Sequencer</option>
          <option>Live Pad</option>
          <option>Melody Maker</option>
          <option>UI / Design</option>
          <option>Performance</option>
        </select>
      </div>
      <div className="bf-form__field">
        <label>Your Comments</label>
        <textarea rows={4} placeholder="Tell us what you loved, hated, or wish existed…" value={form.comment} onChange={update("comment")} required />
      </div>
      <button type="submit" className="launch-btn" style={{ alignSelf: "flex-start" }} disabled={rating === 0 || loading}>
        {loading ? "Submitting..." : "Submit Feedback"}
        {!loading && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    </form>
  );
}

/* ─── MAIN LANDING PAGE ──────────────────────────────────────── */
// 🌟 Added setCurrentView prop so we can navigate to the Community page
export default function Landing({ onLaunch, isLoggedIn, setCurrentView }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_LINKS = [
    { label: "Features", id: "features" },
    { label: "About", id: "about" },
    { label: "FAQ", id: "faq" },
    { label: "Contact", id: "contact" },
    { label: "Feedback", id: "feedback" },
  ];

  return (
    <div className="landing-wrapper">
      {/* ── SCANLINE OVERLAY ── */}
      <div className="bf-scanlines" aria-hidden="true" />

      {/* ── NAVBAR ── */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--bf-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <span>BEATFORGE</span>
        </div>

        {/* Desktop Links */}
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <button key={l.id} className="nav-link-btn" onClick={() => scrollTo(l.id)}>
              {l.label}
            </button>
          ))}
          {/* 🌟 NEW: Desktop Community Link */}
          <button 
            className="nav-link-btn" 
            onClick={() => setCurrentView && setCurrentView('community')}
            style={{ color: 'var(--bf-accent)', fontWeight: 'bold' }}
          >
            Community
          </button>
        </div>

        <div className="nav-right">
          <button className="nav-login-btn" onClick={onLaunch}>
            {isLoggedIn ? "MY STUDIO" : "LOGIN / REGISTER"}
          </button>
          <button className="hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map((l) => (
            <button key={l.id} className="mobile-menu__link" onClick={() => { scrollTo(l.id); setMenuOpen(false); }}>
              {l.label}
            </button>
          ))}
          {/* 🌟 NEW: Mobile Community Link */}
          <button 
            className="mobile-menu__link" 
            onClick={() => { if(setCurrentView) setCurrentView('community'); setMenuOpen(false); }}
            style={{ color: 'var(--bf-accent)', fontWeight: 'bold' }}
          >
            Community
          </button>
          <button className="launch-btn" style={{ marginTop: "8px" }} onClick={() => { onLaunch(); setMenuOpen(false); }}>
            {isLoggedIn ? "RETURN TO STUDIO" : "ENTER THE STUDIO"}
          </button>
        </div>
      )}

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-tag">
            <WaveBars count={8} />
            <span>Browser-native music production</span>
          </div>

          <h1 className="hero-title">
            THE NEXT-GEN <br />
            <span className="text-glow">BROWSER STUDIO</span>
          </h1>

          <p className="hero-subtitle">
            Produce, sequence, and arrange professional beats entirely in Livepad.
            No downloads. No hardware. No limits — just pure creativity.
          </p>

          <div className="hero-stats">
            {[["32", "Step Grid"], ["∞", "Samples"], ["68,563", "Producers"]].map(([n, l]) => (
              <div className="hero-stat" key={l}>
                <span className="hero-stat__num">{n}</span>
                <span className="hero-stat__label">{l}</span>
              </div>
            ))}
          </div>

          <div className="hero-actions">
            <button className="launch-btn" onClick={onLaunch}>
              {isLoggedIn ? "RETURN TO STUDIO" : "ENTER THE STUDIO"}
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button className="ghost-btn" onClick={() => scrollTo("features")}>
              See Features ↓
            </button>
          </div>
        </div>

        {/* 🎛 MOCKUP */}
        <div className="hero-visual">
          <div className="mockup-window">
            <div className="mockup-header">
              <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
              <span className="mockup-title">beatforge — untitled_001.bfp</span>
            </div>
            <div className="mockup-body">
              <div className="mockup-bpm-row">
                <span className="mockup-label">BPM</span>
                <div className="mockup-bpm-display">138</div>
                <span className="mockup-label">4 / 4</span>
                <div className="mockup-transport">
                  {["⏮", "▶", "⏹", "⏺"].map((c) => (
                    <span key={c} className="transport-btn">{c}</span>
                  ))}
                </div>
              </div>
              <div className="mockup-grid">
                {["KICK", "SNARE", "HI-HAT", "PERC"].map((name, row) => (
                  <div className="mockup-row" key={name}>
                    <span className="mockup-row-label">{name}</span>
                    <div className="mockup-steps">
                      {Array.from({ length: 16 }).map((_, i) => {
                        const active = [
                          [0, 4, 8, 12],
                          [4, 12],
                          [0, 2, 4, 6, 8, 10, 12, 14],
                          [3, 7, 11],
                        ][row].includes(i);
                        return <span key={i} className={`step ${active ? "step--on" : ""}`} />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mockup-wave">
                <WaveBars count={32} color="rgba(166,74,255,0.7)" />
              </div>
            </div>
          </div>
          <div className="ambient-glow" />
        </div>
      </div>

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <Section id="features" className="features-section">
        <div className="section-header">
          <div className="section-tag">What's Inside</div>
          <h2 className="section-title">Everything You Need to Create</h2>
          <p className="section-subtitle">
            Six core tools designed together so you can go from idea to finished beat without ever leaving the browser.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── ABOUT ────────────────────────────────────────────── */}
      <Section id="about" className="about-section">
        <div className="about-inner">
          <div className="about-visual">
            <div className="about-card">
              <div className="about-card__accent" />
              <div className="about-card__body">
                <p className="about-card__quote">
                  "We believe great music shouldn't be gated behind expensive tools or steep learning curves."
                </p>
                <span className="about-card__author">— BeatForge Team</span>
              </div>
            </div>
            <div className="about-pillars">
              {[["Free", "No cost, ever"], ["Browser", "Zero installs"], ["Intuitive", "Learn in minutes"]].map(([t, s]) => (
                <div className="about-pillar" key={t}>
                  <span className="about-pillar__title">{t}</span>
                  <span className="about-pillar__sub">{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="about-content">
            <div className="section-tag">About BeatForge</div>
            <h2 className="section-title">Built for Beginners.<br />Capable Enough for Pros.</h2>
            <p className="about-text">
              BeatForge started from a simple frustration — professional music tools like FL Studio and Abelton are
              incredibly powerful, but they're expensive, complex, and require installation.
            </p>
            <p className="about-text">
              So we built BeatForge: a lightweight, web-based  Beat-Making studio that brings the core workflow of professional
              DAWs into your browser. No barriers. No gatekeeping. Just music.
            </p>
            <p className="about-text">
              Whether you're making your very first beat or an experienced producer looking for a quick sketchpad,
              BeatForge gives you the tools to create, experiment, and export — instantly.
            </p>
            <div className="about-cta">
              <button className="launch-btn" onClick={onLaunch}>
                Start Creating Free
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <Section id="faq" className="faq-section">
        <div className="section-header">
          <div className="section-tag">Got Questions?</div>
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} item={item} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
          ))}
        </div>
        <p className="faq-footer">
          Still have questions?{" "}
          <button className="faq-link" onClick={() => scrollTo("contact")}>
            Reach out to our support team →
          </button>
        </p>
      </Section>

      {/* ─── CONTACT ──────────────────────────────────────────── */}
      <Section id="contact" className="contact-section">
        <div className="two-col">
          <div className="two-col__info">
            <div className="section-tag">Support</div>
            <h2 className="section-title">Get in Touch</h2>
            <p className="about-text">Found a bug? Need help getting started? Have a wild feature idea? We're a small team and we read every message.</p>
            <div className="contact-channels">
              {[
                {
                  icon: (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>),
                  label: "Email Support", val: "support@beatforge.io",
                },
                {
                  icon: (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
                  label: "Response Time", val: "Within 24 hours",
                },
              ].map(({ icon, label, val }) => (
                <div className="contact-channel" key={label}>
                  <span className="contact-channel__icon">{icon}</span>
                  <div>
                    <div className="contact-channel__label">{label}</div>
                    <div className="contact-channel__val">{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="two-col__form"><ContactForm /></div>
        </div>
      </Section>

      {/* ─── FEEDBACK ─────────────────────────────────────────── */}
      <Section id="feedback" className="feedback-section">
        <div className="two-col">
          <div className="two-col__info">
            <div className="section-tag">Your Voice Matters</div>
            <h2 className="section-title">Leave Feedback</h2>
            <p className="about-text">BeatForge is built by its community. Rate your experience, tell us what works, and help us prioritize what we build next.</p>
            <div className="feedback-badges">
              {["UI Design", "Performance", "Step Sequencer", "Melody Maker", "Live Pad", "Samples"].map((t) => (
                <span key={t} className="feedback-badge">{t}</span>
              ))}
            </div>
          </div>
          <div className="two-col__form"><FeedbackForm /></div>
        </div>
      </Section>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <footer className="bf-footer">
        <div className="bf-footer__inner">
          <div className="nav-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--bf-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span style={{ fontSize: "1rem" }}>BEATFORGE</span>
          </div>
          <div className="bf-footer__links">
            {NAV_LINKS.map((l) => (
              <button key={l.id} className="footer-link" onClick={() => scrollTo(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <p className="bf-footer__copy">© {new Date().getFullYear()} BeatForge. Made for creators, by creators.</p>
        </div>
      </footer>
    </div>
  );
}