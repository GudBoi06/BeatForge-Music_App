import React, { useState } from "react";
import "../styles/auth.css";

export default function Auth({ onLogin }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here is where you will eventually link your backend (Node/Express/Firebase)
    console.log("Submitting:", { email, password, username, type: isLoginView ? "Login" : "Register" });
    
    // Simulating a successful login to enter the app
    if (onLogin) onLogin();
  };

  return (
    <div className="auth-wrapper">
      {/* Feature #5: Cinematic Welcome Screen Title */}
      <h1 className="beatforge-title">BeatForge</h1>
      <p className="auth-subtitle">The Next-Gen Browser Studio</p>

      {/* Feature #2: Glassmorphism Card */}
      <div className="auth-card">
        <h2>{isLoginView ? "Welcome Back" : "Join the Forge"}</h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLoginView && (
            <input
              type="text"
              placeholder="Producer Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="auth-submit-btn">
            {isLoginView ? "ENTER STUDIO" : "CREATE ACCOUNT"}
          </button>
        </form>

        <p className="auth-toggle" onClick={() => setIsLoginView(!isLoginView)}>
          {isLoginView 
            ? "New here? Create an account." 
            : "Already a producer? Log in."}
        </p>
      </div>
    </div>
  );
}