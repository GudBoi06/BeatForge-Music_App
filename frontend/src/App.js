import React, { useState } from "react";
import Auth from "./components/Auth";
import Home from "./pages/Home"; // <-- Routed correctly to your pages directory!

export default function App() {
  // This state controls which screen is visible
  const [currentUser, setCurrentUser] = useState(null);

  console.log("👑 App.js is running! Current Producer:", currentUser);

  const handleLogout = () => {
    localStorage.removeItem("beatforge_token");
    setCurrentUser(null); 
  };

  return (
    <>
      {currentUser ? (
        <Home currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <Auth onLogin={(user) => setCurrentUser(user)} />
      )}
    </>
  );
}