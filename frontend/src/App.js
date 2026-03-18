import React, { useState } from "react";
import Auth from "./components/Auth";
import Home from "./pages/Home";

export default function App() {
  // If true, the user sees the DAW. If false, they see the login screen.
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      {isAuthenticated ? (
        <Home />
      ) : (
        <Auth onLogin={() => setIsAuthenticated(true)} />
      )}
    </>
  );
}