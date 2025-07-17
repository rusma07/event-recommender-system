const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();         // Load .env variables
connectDB();             // Connect to MongoDB

const app = express();
app.use(express.json());

// Your routes here...
app.listen(5000, () => {
  console.log('Server running on port 5000');
});
