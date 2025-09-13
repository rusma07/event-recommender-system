// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import sequelize from "./db.js"; // note the .js extension
import userRoutes from "./routes/userRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Use routes
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/interactions", );
const PORT = process.env.PORT || 5000;

// Sync DB and start server
sequelize.sync({ alter: false }) // alter updates schema if needed
  .then(() => {
    console.log("✅ Database synced");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error("❌ DB sync error:", err));
