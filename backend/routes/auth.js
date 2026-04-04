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

    // 3. Send back the success response with a token AND isPro status
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isPro: user.isPro, // 🌟 FIX: Tell React their Pro status
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
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 2. Check if the password matches the hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 3. Send back the success response with a token AND isPro status
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isPro: user.isPro, // 🌟 FIX: Tell React they are Pro when they log back in!
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

module.exports = router;