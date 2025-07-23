const mongoose = require('mongoose');
const Event = require('./models/Event'); // path to your model
const mockEvents = require('./mockEvents'); // path to mock data

mongoose.connect('mongodb://localhost:27017/eventDB', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => Event.insertMany(mockEvents))
  .then(() => {
    console.log('Mock events inserted successfully!');
    mongoose.disconnect();
  })
  .catch((err) => console.error(err));
const mockEvents = [
  {
    event_name: "Kathmandu Code Camp",
    start_date: new Date("2025-08-15"),
    end_date: new Date("2025-08-16"),
    location: "Kathmandu, Nepal",
    event_type: "Workshop",
    organizer: "TechKTM",
    website_url: "https://techktm.org/codecamp"
  },
  {
    event_name: "Nepal AI Fellowship",
    start_date: new Date("2025-09-01"),
    end_date: new Date("2025-11-30"),
    location: "Hybrid (Online + Kathmandu)",
    event_type: "Fellowship",
    organizer: "AI Nepal",
    website_url: "https://ainepal.org/fellowship"
  },
  {
    event_name: "Himalayan Hackathon",
    start_date: new Date("2025-10-10"),
    end_date: new Date("2025-10-12"),
    location: "Pokhara, Nepal",
    event_type: "Hackathon",
    organizer: "Himalaya Tech Hub",
    website_url: "https://himalayahack.org"
  },
  {
    event_name: "React Bootcamp Nepal",
    start_date: new Date("2025-08-20"),
    end_date: new Date("2025-08-25"),
    location: "Lalitpur, Nepal",
    event_type: "Bootcamp",
    organizer: "Code for Change",
    website_url: "https://codeforchange.org/bootcamp"
  },
  {
    event_name: "Data Science Webinar Series",
    start_date: new Date("2025-07-25"),
    end_date: new Date("2025-07-25"),
    location: "Online",
    event_type: "Webinar",
    organizer: "DSN Nepal",
    website_url: "https://dsn.org.np/webinars"
  }
];

module.exports = mockEvents;
