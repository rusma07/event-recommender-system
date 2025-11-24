// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // Sequelize model

export default async function auth(req, res, next) {
  try {
    const authHeader = req.header("Authorization") || "";
    // Expect: "Bearer <token>"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied, no token provided" });
    }

    // Decode + verify token (this just gives you { id, iat, exp })
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return res.status(403).json({ message: "Invalid token payload" });
    }

    // Fetch user from DB and include role
    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "email", "role", "name"], // adjust if your field is `isAdmin` etc.
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Optional: log once to see what role looks like
    console.log("✅ Auth user:", user.toJSON());

    // Attach plain object instead of Sequelize instance (less weird in logs/middleware)
    req.user = user.toJSON();

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
