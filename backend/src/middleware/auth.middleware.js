import jwt from "jsonwebtoken";
import { query } from "../config/database.js";

/** verifyToken – JWT authentication middleware. * Reads the Bearer token from the Authorization header, verifies it with JWT_SECRET, and fetches the user from PostgreSQL. Verifies that the user still exists and their role matches the JWT. Attaches { userId, role } to req.user. * Returns: 401 – no token supplied / invalid / expired 403 – user not found or role mismatch */
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Load user from PostgreSQL to verify existence and role match
    const result = await query("SELECT id, role FROM users WHERE id = $1", [decoded.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(403).json({ success: false, message: "User no longer exists." });
    }

    if (user.role !== decoded.role) {
      return res.status(403).json({ success: false, message: "Role mismatch. Access denied." });
    }
    req.user = {
      userId: user.id,
      role: user.role,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "Token expired." });
    }
    // JsonWebTokenError, NotBeforeError, or any other jwt error
    return res
      .status(401)
      .json({ success: false, message: "Invalid token." });
  }
};

/** requireRole – role-based authorization middleware factory. * Usage: requireRole(['admin', 'worker']) Roles are stored in lowercase in PostgreSQL and in the JWT payload. The check is case-insensitive to tolerate minor casing differences. * Returns 403 Forbidden if the authenticated user's role is not in the list. */
export const requireRole = (roles) => {
  const normalizedRoles = roles.map((r) => r.toLowerCase());
  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }
    next();
  };
};
