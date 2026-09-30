import jwt from "jsonwebtoken";
import { query } from "../config/database.js";

// JWT authentication middleware.
// Verifies token, user existence, and role.
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

// Role-based authorization middleware factory.
// Returns 403 Forbidden if user's role is not in the list.
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
