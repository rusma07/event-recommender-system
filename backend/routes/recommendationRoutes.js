import express from "express";
import { getRecommendations } from "../services/recommendService.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/:userId",auth, getRecommendations);

export default router;
