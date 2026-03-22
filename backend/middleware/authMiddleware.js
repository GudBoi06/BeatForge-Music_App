// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // 1. Grab the token from the header (This matches what we put in StepSequencer.jsx)
  const token = req.header("x-auth-token");

  // 2. If there is no token, deny access
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied." });
  }

  // 3. Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Because your auth.js creates the token with { id: user._id }
    // We attach that ID to the request so presets.js knows exactly who is saving the beat!
    req.user = { id: decoded.id }; 
    
    next(); // Pass control to the next function
  } catch (err) {
    res.status(401).json({ message: "Token is not valid or has expired." });
  }
};