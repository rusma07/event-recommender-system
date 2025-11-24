// authMiddleware.js
import jwt from "jsonwebtoken";

export default class AuthMiddleware {
  constructor(UserModel, jwtSecret) {
    this.UserModel = UserModel;
    this.jwtSecret = jwtSecret;

    // Bind so `this` works when passed directly to Express
    this.handle = this.handle.bind(this);
  }

  // Clean helper to extract token
  _getTokenFromHeader(req) {
    const authHeader = req.header("Authorization");
    if (!authHeader) return null;

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return null;

    return token;
  }

  async handle(req, res, next) {
    try {
      const token = this._getTokenFromHeader(req);

      if (!token) {
        return res
          .status(401)
          .json({ message: "Access denied, no token provided" });
      }

      // Decode and verify token
      const decoded = jwt.verify(token, this.jwtSecret);
      if (!decoded?.id) {
        return res.status(403).json({ message: "Invalid token" });
      }

      // Fetch user from DB to attach role
      const user = await this.UserModel.findByPk(decoded.id, {
        attributes: ["id", "email", "role", "name"],
      });

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
}
