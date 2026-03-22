const express = require('express');
const router = express.Router();
const Preset = require('../models/Preset');
const auth = require('../middleware/authMiddleware'); // Your existing token verifier!

// 📥 GET: Fetch all presets for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const presets = await Preset.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: "Failed to load presets" });
  }
});

// 💾 POST: Save a new preset
router.post('/', auth, async (req, res) => {
  try {
    const { name, bpm, stepsCount, grid, volumes, mutedTracks, kitIndex } = req.body;
    
    const newPreset = new Preset({
      user: req.user.id,
      name, bpm, stepsCount, grid, volumes, mutedTracks, kitIndex
    });

    const savedPreset = await newPreset.save();
    res.json(savedPreset);
  } catch (err) {
    res.status(500).json({ error: "Failed to save preset" });
  }
});

// 🗑️ DELETE: Delete a preset (Security check: ensures it belongs to the user)
router.delete('/:id', auth, async (req, res) => {
  try {
    const preset = await Preset.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!preset) return res.status(404).json({ msg: "Preset not found or unauthorized" });
    res.json({ msg: "Preset deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete preset" });
  }
});

module.exports = router;