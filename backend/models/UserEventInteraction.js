const mongoose = require('mongoose');

const userEventInteractionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  rating: { type: Number, min: 1, max: 5 },  // Optional, for explicit feedback
  liked: { type: Boolean },                   // Optional, for implicit feedback
  attended: { type: Boolean },                // Optional, example interaction
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserEventInteraction', userEventInteractionSchema);
