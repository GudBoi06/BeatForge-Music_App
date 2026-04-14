const router = require("express").Router();
const Preset = require("../models/Preset");
const auth   = require("../middleware/authMiddleware");

router.get("/", auth, async (req, res) => {
  try { res.json(await Preset.find({ user: req.user.id }).sort({ createdAt: -1 })); }
  catch { res.status(500).json({ error: "Failed to load presets" }); }
});

router.post("/", auth, async (req, res) => {
  try {
    const { name, bpm, stepsCount, grid, volumes, mutedTracks, kitIndex } = req.body;
    res.json(await Preset.create({ user: req.user.id, name, bpm, stepsCount, grid, volumes, mutedTracks, kitIndex }));
  } catch { res.status(500).json({ error: "Failed to save preset" }); }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const preset = await Preset.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!preset) return res.status(404).json({ msg: "Preset not found or unauthorized" });
    res.json({ msg: "Preset deleted" });
  } catch { res.status(500).json({ error: "Failed to delete preset" }); }
});

module.exports = router;