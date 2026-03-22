const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json()); // Allows server to accept JSON data
app.use(cors()); // Allows your React app to make requests

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);
app.use('/api/presets', require('./routes/presets'));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎧 BeatForge Backend running on port ${PORT}`);
});