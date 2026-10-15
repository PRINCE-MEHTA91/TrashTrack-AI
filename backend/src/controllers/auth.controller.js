import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../config/database.js";
// Generate a JWT for the given user containing userId and role.
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// Safe user fields to return in API responses. password_hash is excluded.
const SAFE_USER_FIELDS = `
  id,
  full_name,
  email,
  role,
  profile_image,
  phone_number,
  address,
  is_email_verified,
  status,
  municipality_id,
  requested_municipality_id,
  created_at,
  updated_at
`;
const signupSchema = z.object({
  fullName:                z.string().min(2),
  email:                   z.string().email(),
  password:                z.string().min(6),
  role:                    z.enum(["citizen", "worker", "admin"]),
  adminSecret:             z.string().optional(),
  phoneNumber:             z.string().optional(),
  phone_number:            z.string().optional(),
  address:                 z.string().optional(),
  municipalityId:          z.string().uuid().optional().nullable(),
  requestedMunicipalityId: z.string().uuid().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["citizen", "worker", "admin"]),
});

// Registration endpoint.
export const signup = async (req, res, next) => {
  try {
    const parsed = signupSchema.parse(req.body);

    // Admin accounts require a secret key to prevent privilege escalation
    if (parsed.role === "admin") {
      const requiredSecret = process.env.ADMIN_SIGNUP_SECRET;
      if (!requiredSecret || parsed.adminSecret !== requiredSecret) {
        return res.status(403).json({
          success: false,
          message: "Invalid or missing admin secret key. Contact your system administrator.",
        });
      }
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

    const phoneNumber = (parsed.phoneNumber || parsed.phone_number || "").trim() || null;
    const address = (parsed.address || "").trim() || null;
    const requestedMunicipalityId = parsed.requestedMunicipalityId || parsed.municipalityId || null;
    const initialStatus = parsed.role === "worker" ? "pending_verification" : "active";

    await query("BEGIN");

    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role, phone_number, address, requested_municipality_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${SAFE_USER_FIELDS}`,
      [parsed.fullName, parsed.email, passwordHash, parsed.role, phoneNumber, address, requestedMunicipalityId, initialStatus]
    );

    const user = result.rows[0];

    // When a worker registers, create a PENDING_VERIFICATION request in PostgreSQL
    if (parsed.role === "worker") {
      await query(
        `INSERT INTO worker_approvals (worker_id, requested_municipality_id, status)
         VALUES ($1, $2, 'PENDING_VERIFICATION')
         ON CONFLICT (worker_id)
         DO UPDATE SET requested_municipality_id = EXCLUDED.requested_municipality_id,
                       status = 'PENDING_VERIFICATION',
                       rejection_reason = NULL,
                       requested_at = CURRENT_TIMESTAMP`,
        [user.id, requestedMunicipalityId]
      );
    }

    await query("COMMIT");

    const token = generateToken(user);

    return res.status(201).json({ success: true, token, user });
  } catch (err) {
    try { await query("ROLLBACK"); } catch (_) {}
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ success: false, message: "Validation error.", errors: err.errors });
    }
    next(err);
  }
};

// Email + password login. Verifies hash and issues a JWT.
export const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);

    // Fetch all users with this email
    const result = await query(
      `SELECT id, password_hash, role, full_name, email, profile_image, phone_number, address,
              is_email_verified, status, municipality_id, requested_municipality_id, created_at, updated_at
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

// Get current authenticated user data.
export const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, full_name, email, role, profile_image, phone_number, address,
              is_email_verified, status, municipality_id, requested_municipality_id, created_at, updated_at
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

// Update user profile
export const updateMe = async (req, res, next) => {
  try {
    const { full_name, profile_image, address } = req.body;
    let { phone_number } = req.body;

    if (phone_number !== undefined) {
      phone_number = phone_number.trim();
      if (phone_number !== "" && !/^\d{10}$/.test(phone_number)) {
        return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits." });
      }
    }
    
    const result = await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           profile_image = COALESCE($2, profile_image),
           phone_number = COALESCE($3, phone_number),
           address = COALESCE($4, address),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING ${SAFE_USER_FIELDS}`,
      [full_name, profile_image, phone_number, address, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
