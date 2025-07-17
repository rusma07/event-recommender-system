const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  start: { type: Date, required: true },   // event start datetime
  end: { type: Date, required: true },     // event end datetime
  location: String,
  // user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
