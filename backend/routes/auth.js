const express = require("express");
const router = express.Router();
const User = require("../models/User"); 
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT Token Function
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// ==========================================
// @route   POST /api/auth/register
// @desc    Register a new Producer
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Check if the producer already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: "Producer or Email already exists in the Forge." });
    }

    // 2. Create the new producer
    const user = await User.create({ username, email, password });

    // 3. Send back the success response
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isPro: user.isPro, 
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// ==========================================
// @route   POST /api/auth/login
// @desc    Authenticate Producer & get token
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the producer by email
    const user = await User.findOne({ email });
    
    // 🌟 FIX: Specifically tell the user they haven't registered yet
    if (!user) {
      return res.status(401).json({ message: "You haven't registered yet. Register First!" });
    }

    // 2. Check if the password matches the hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    
    // 🌟 FIX: Specific message if the email exists but password is wrong
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // 3. Send back the success response
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isPro: user.isPro, 
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

module.exports = router;