// backend/controllers/userController.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { Op } from "sequelize";
import bcrypt from "bcrypt";

class UserController {
  constructor() {
    this.registerUser = this.registerUser.bind(this);
    this.loginUser = this.loginUser.bind(this);
    this.logoutUser = this.logoutUser.bind(this);
    this.updateUserProfile = this.updateUserProfile.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
  }

  // REGISTER USER
  async registerUser(req, res) {
    try {
      const { name, email, password } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashed });

      res.status(201).json({ message: "User registered", user });
    } catch (error) {
      console.error("❌ Registration Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // LOGIN USER
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(404).json({ message: "User not found" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({ token, user });
    } catch (error) {
      console.error("❌ Login Error:", error);
      res.status(500).json({ error: error.message });
    }
  }


  // LOGOUT USER
  logoutUser(req, res) {
    // For JWT, just instruct client to delete token
    res.json({ message: "User logged out successfully" });
  }


  // UPDATE PROFILE (Protected)
  async updateUserProfile(req, res) {
    const userId = req.user.id;
    const { name, email, oldPassword, newPassword, confirmPassword } = req.body;

    try {
      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (newPassword) {
        const validOld = await bcrypt.compare(oldPassword, user.password);
        if (!validOld) {
          return res.status(400).json({ message: "Old password is incorrect" });
        }

        if (newPassword !== confirmPassword) {
          return res.status(400).json({ message: "New passwords do not match" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
      }

      user.name = name || user.name;
      user.email = email || user.email;

      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  }


  // FORGOT PASSWORD
  async forgotPassword(req, res) {
    const { email } = req.body;
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(404).json({ message: "User not found" });

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;
      await user.save();

      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request",
        html: `
          <p>You requested a password reset.</p>
          <p>Click <a href="${resetURL}">here</a> to reset your password.</p>
          <p>This link will expire in 1 hour.</p>
        `,
      });

      res.json({ message: "Password reset link sent to your email" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }


  // RESET PASSWORD
  async resetPassword(req, res) {
    const { token, newPassword, confirmPassword } = req.body;

    try {
      const user = await User.findOne({
        where: {
          resetToken: token,
          resetTokenExpiry: { [Op.gt]: new Date() },
        },
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      user.resetToken = null;
      user.resetTokenExpiry = null;

      await user.save();

      res.json({ message: "Password reset successful" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
}

const userController = new UserController();

export const registerUser = userController.registerUser;
export const loginUser = userController.loginUser;
export const logoutUser = userController.logoutUser;
export const updateUserProfile = userController.updateUserProfile;
export const forgotPassword = userController.forgotPassword;
export const resetPassword = userController.resetPassword;

export default userController;
