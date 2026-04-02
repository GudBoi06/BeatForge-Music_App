const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer"); 
const path = require("path");     
require("dotenv").config();

// 📥 Import your Auth Middleware and the new Sample Model
const auth = require("./middleware/authMiddleware.js"); // Ensure this path matches your auth middleware!
const Sample = require("./models/Sample"); // Ensure you created this file in step 1!

const app = express();

// Middleware
app.use(express.json()); 
app.use(cors()); 

// 📂 Serve the uploads folder so React can play the audio files!
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);
app.use('/api/presets', require('./routes/presets'));

// ==========================================
// 🌩️ MULTER CONFIGURATION & MONGO ROUTES
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ storage: storage });

// 1. 📤 POST: Upload file AND save to MongoDB
app.post('/api/samples', auth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const cleanName = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, "");
    
    // 🔥 Save the record to MongoDB linked to this specific user!
    const newSample = new Sample({
      user: req.user.id, 
      name: cleanName,
      fileUrl: fileUrl
    });

    await newSample.save();

    // Send it back to React formatted exactly how the Sidebar likes it
    res.json({ id: newSample._id, name: newSample.name, file: newSample.fileUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Server Error");
  }
});

// 2. 📥 GET: Fetch all saved samples for the logged-in user
app.get('/api/samples', auth, async (req, res) => {
  try {
    // Find samples belonging to this user, newest first
    const samples = await Sample.find({ user: req.user.id }).sort({ createdAt: -1 });
    
    // Format them for the React frontend
    const formattedSamples = samples.map(s => ({
      id: s._id,
      name: s.name,
      file: s.fileUrl
    }));

    res.json(formattedSamples);
  } catch (err) {
    console.error("Fetch samples error:", err);
    res.status(500).send("Server Error");
  }
});
// ==========================================

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎧 BeatForge Backend running on port ${PORT}`);
});