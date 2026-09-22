import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../config/database.js";
/** Generate a JWT for the given user. Payload contains ONLY userId and role — never email, phone, or password data. Uses JWT_SECRET and JWT_EXPIRES_IN from environment variables. * @param {{ id: string, role: string }} user @returns {string} signed JWT */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

/** Safe user fields to return in API responses. password_hash is explicitly excluded. */
const SAFE_USER_FIELDS = `
  id,
  full_name,
  email,
  role,
  is_email_verified,
  status,
  created_at,
  updated_at
`;
const signupSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["citizen", "worker", "admin"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["citizen", "worker", "admin"]),
});
/** POST /api/v1/auth/signup Email + password registration. Creates a CITIZEN account. */
export const signup = async (req, res, next) => {
  try {
    const parsed = signupSchema.parse(req.body);

    // Prevent privilege escalation — public signup cannot be admin
    if (parsed.role === "admin") {
      return res.status(403).json({ success: false, message: "Public signup is not allowed for ADMIN role." });
    }

    // Check duplicate email + role
    const existing = await query(
      "SELECT id FROM users WHERE email = $1 AND role = $2",
      [parsed.email, parsed.role]
    );
    if (existing.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: `Email already registered as a ${parsed.role.toUpperCase()}.` });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(parsed.password, salt);

    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SAFE_USER_FIELDS}`,
      [parsed.fullName, parsed.email, passwordHash, parsed.role]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    return res.status(201).json({ success: true, token, user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, message: "Validation error.", errors: err.errors });
    }
    next(err);
  }
};

/** POST /api/v1/auth/login Email + password login. Verifies bcrypt hash and issues a JWT. */
export const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);

    // Fetch all users with this email
    const result = await query(
      `SELECT id, password_hash, role, full_name, email,
              is_email_verified, status, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [parsed.email]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "User not found. Please sign up first." });
    }
    const user = result.rows.find((r) => r.role === parsed.role);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Existing email but wrong role selected." });
    }

    if (!user.password_hash) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(parsed.password, user.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    const token = generateToken(user);

    // Strip password_hash before sending
    const { password_hash, ...userWithoutPassword } = user;
    return res.json({ success: true, token, user: userWithoutPassword });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, message: "Validation error.", errors: err.errors });
    }
    next(err);
  }
};

/** GET /api/v1/auth/me Protected route. Returns the currently authenticated user's PostgreSQL data. Requires verifyToken middleware — req.user.userId is set by the middleware. Never returns password_hash. */
export const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, full_name, email, role,
              is_email_verified, status, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
