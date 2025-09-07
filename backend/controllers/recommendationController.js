// backend/controllers/userController.js
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashed });
    res.status(201).json({ message: "User registered", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
