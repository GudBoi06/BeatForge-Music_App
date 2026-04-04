const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  rating: { type: Number, required: true },
  category: { type: String, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);