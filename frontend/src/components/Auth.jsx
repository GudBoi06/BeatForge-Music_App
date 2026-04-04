import React, { useState } from "react";
import "../styles/auth.css";

export default function Auth({ onLogin }) {
  // --- FORM STATES ---
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // --- UI TOGGLE STATES ---
  const [isLoginView, setIsLoginView] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // --- STATUS STATES ---
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // 🌟 FIX: Strict Email Validation Regex (Requires a proper domain ending like .com)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("Please enter a valid email address (eg:producer@gmail.com).");
      return;
    }

    // Prevent submission if registering and passwords don't match
    if (!isLoginView && password !== confirmPassword) {
      setErrorMsg("Passwords do not match!");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Prepare the exact data the backend needs
      const payload = isLoginView 
        ? { email, password } 
        : { username, email, password };

      // 2. Point to your Node.js server (assuming it's on port 5000)
      const endpoint = isLoginView 
        ? "http://localhost:5000/api/auth/login" 
        : "http://localhost:5000/api/auth/register";

      // 3. Send the request
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // 4. Parse the backend response
      const data = await response.json();

      // 5. Check if the server sent back an error status (like 400 or 401)
      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      // 6. SUCCESS! 
      setIsLoading(false);
      
      // Save the JWT token so the user stays logged in across sessions
      localStorage.setItem("beatforge_token", data.token);

      // Tell the main App that we are officially logged in AND pass the isPro status!
      onLogin({ 
        _id: data._id, 
        username: data.username, 
        email: data.email,
        isPro: data.isPro 
      });

    } catch (error) {
      setIsLoading(false);
      setErrorMsg(error.message);
    }
  };

  // SVGs for the eye icons
  const eyeOpen = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  const eyeClosed = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );

  return (
    <div className="auth-wrapper">
      <h1 className="beatforge-title">BEATFORGE</h1>
      <p className="auth-subtitle">The Next-Gen Browser Studio</p>

      <div className="auth-card">
        <h2>{isLoginView ? "Welcome Back" : "Join the Forge"}</h2>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

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

          {/* MAIN PASSWORD FIELD */}
          <div className="input-wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <button 
              type="button" 
              className="password-toggle" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? eyeOpen : eyeClosed}
            </button>
          </div>

          {/* CONFIRM PASSWORD FIELD (Registration Only) */}
          {!isLoginView && (
            <div className="input-wrapper">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="Confirm Password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="password-toggle" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? eyeOpen : eyeClosed}
              </button>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? "CONNECTING..." : isLoginView ? "ENTER STUDIO" : "CREATE ACCOUNT"}
          </button>
        </form>

        <p 
          className="auth-toggle" 
          onClick={() => {
            setIsLoginView(!isLoginView);
            setErrorMsg(""); // Clear errors when switching views
            setPassword("");
            setConfirmPassword("");
          }}
        >
          {isLoginView ? "New producer? Create an account." : "Already a producer? Log in."}
        </p>
      </div>
    </div>
  );
}