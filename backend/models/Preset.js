const mongoose = require('mongoose');

const presetSchema = new mongoose.Schema({
  // Locks the preset to the specific user's ID
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  bpm: { type: Number, required: true },
  stepsCount: { type: Number, required: true },
  kitIndex: { type: Number, required: true },
  
  // 2D Arrays and 1D Arrays to hold the sequencer grid perfectly
  grid: [[Boolean]],      
  volumes: [Number],      
  mutedTracks: [Boolean], 
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Preset', presetSchema);