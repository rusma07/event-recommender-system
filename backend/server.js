// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./db.js";
import userRoutes from "./routes/userRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import interactionRoutes from "./routes/interactionRoutes.js";
import { ensureAdmins } from "./utils/ensureAdmins.js";   // ✅ add

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/interactions", interactionRoutes);

const PORT = process.env.PORT || 5000;

sequelize
  .sync({ alter: false })
  .then(async () => {
    console.log("✅ Database synced");

    // ✅ ensure admins are present/promoted on every boot (idempotent)
    await ensureAdmins();

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ DB sync error:", err));
