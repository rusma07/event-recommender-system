import jwt from "jsonwebtoken";
import User from "../models/User.js"; // Sequelize model

export default async function auth(req, res, next) {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.split(" ")[1]; // Expect "Bearer <token>"
    if (!token) {
      return res.status(401).json({ message: "Access denied, no token provided" });
    }

    // Decode and verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return res.status(403).json({ message: "Invalid token" });
    }

    // Fetch user from DB to attach role
    const user = await User.findByPk(decoded.id, { attributes: ["id", "email", "role", "name"] });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user; // Make the user object available in controllers
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(403).json({ message: "Invalid or expired token" });
  }
}
