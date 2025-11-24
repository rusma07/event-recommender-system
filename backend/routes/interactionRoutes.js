// routes/interactionRoutes.js
import express from "express";
import {
  logInteraction,
  getOnboardingStatus,
} from "../controllers/interactionController.js";

const router = express.Router();

router.post("/", logInteraction);
router.get("/:userId/onboarding-status", getOnboardingStatus);

export default router;
