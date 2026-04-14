const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");

const genToken  = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
const userPayload = (u) => ({ _id: u._id, username: u.username, email: u.email, isPro: u.isPro, token: genToken(u._id) });

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (await User.findOne({ $or: [{ email }, { username }] }))
      return res.status(400).json({ message: "Producer or Email already exists in the Forge." });
    res.status(201).json(userPayload(await User.create({ username, email, password })));
  } catch (e) {
    console.error("Registration Error:", e);
    res.status(500).json({ message: "Server error during registration." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)                                  return res.status(401).json({ message: "You haven't registered yet. Register First!" });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ message: "Incorrect password." });
    res.json(userPayload(user));
  } catch (e) {
    console.error("Login Error:", e);
    res.status(500).json({ message: "Server error during login." });
  }
});

module.exports = router;