import express from "express";
import { registerUser,loginUser, logoutUser, updateUserProfile, forgotPassword,resetPassword } from "../controllers/userController.js";
import auth from "../middleware/auth.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout",logoutUser);
router.put("/profile",auth, updateUserProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);


export default router;
