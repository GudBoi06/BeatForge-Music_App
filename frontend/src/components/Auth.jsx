import React, { useState } from "react";
import "../styles/auth.css";

const EyeOpen = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeClosed = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

function PasswordInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrapper">
      <input type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={onChange} required />
      <button type="button" className="password-toggle" onClick={() => setShow(!show)}>
        {show ? <EyeOpen /> : <EyeClosed />}
      </button>
    </div>
  );
}

export default function Auth({ onLogin }) {
  const [fields, setFields]       = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [isLoginView, setLoginView] = useState(true);
  const [errorMsg, setErrorMsg]   = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const { username, email, password, confirmPassword } = fields;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setErrorMsg("Please enter a valid email address (eg:producer@gmail.com).");
    }
    if (!isLoginView) {
      if (password !== confirmPassword) return setErrorMsg("Passwords do not match!");
      if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(password))
        return setErrorMsg("Password must be at least 8 characters long, contain one uppercase letter, and one special character.");
    }

    setIsLoading(true);
    try {
      const endpoint = isLoginView ? "http://localhost:5000/api/auth/login" : "http://localhost:5000/api/auth/register";
      const payload  = isLoginView ? { email, password } : { username, email, password };
      const res      = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data     = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong.");
      localStorage.setItem("beatforge_token", data.token);
      onLogin({ _id: data._id, username: data.username, email: data.email, isPro: data.isPro });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchView = () => {
    setLoginView(!isLoginView);
    setErrorMsg("");
    setFields((f) => ({ ...f, password: "", confirmPassword: "" }));
  };

  return (
    <div className="auth-wrapper">
      <h1 className="beatforge-title">BEATFORGE</h1>
      <p className="auth-subtitle">The Next-Gen Browser Studio</p>

      <div className="auth-card">
        <h2>{isLoginView ? "Welcome Back" : "Join the Forge"}</h2>
        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLoginView && <input type="text" placeholder="Producer Name" value={fields.username} onChange={set("username")} required />}

          <input type="email" placeholder="Email Address" value={fields.email} onChange={set("email")} required />

          <PasswordInput placeholder="Password" value={fields.password} onChange={set("password")} />

          {!isLoginView && (
            <>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: -10, marginBottom: 15, padding: 10, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 6, borderLeft: "2px solid var(--accent,#a64aff)", lineHeight: 1.4 }}>
                ℹ️ Password must be at least <strong>8 characters</strong> and include <strong>1 uppercase letter</strong> and <strong>1 special character</strong>.
              </div>
              <PasswordInput placeholder="Confirm Password" value={fields.confirmPassword} onChange={set("confirmPassword")} />
            </>
          )}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? "CONNECTING..." : isLoginView ? "ENTER STUDIO" : "CREATE ACCOUNT"}
          </button>
        </form>

        <p className="auth-toggle" onClick={switchView}>
          {isLoginView ? "New producer? Create an account." : "Already a producer? Log in."}
        </p>
      </div>
    </div>
  );
}