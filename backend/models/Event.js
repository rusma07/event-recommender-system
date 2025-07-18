module.exports = mongoose.model('Event', eventSchema);
const EventSchema = new mongoose.Schema({
  event_name: String,
  start_date: Date,
  end_date: Date,
  location: String,
  event_type: String,
  organizer: String,
  website_url: String,
});

