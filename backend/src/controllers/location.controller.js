import { z } from "zod";
import { query } from "../config/database.js";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
});

// POST /api/v1/location – upsert authenticated user's location (userId from JWT, never body).
export const upsertLocation = async (req, res, next) => {
  try {
    const parsed = locationSchema.parse(req.body);
    const userId = req.user.userId; // from verifyToken middleware — never from body

    await query(
      `INSERT INTO user_locations (user_id, latitude, longitude, accuracy, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET
         latitude   = EXCLUDED.latitude,
         longitude  = EXCLUDED.longitude,
         accuracy   = EXCLUDED.accuracy,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, parsed.latitude, parsed.longitude, parsed.accuracy]
    );

    return res.json({
      success: true,
      message: "Location updated.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error.",
        errors: err.errors,
      });
    }
    next(err);
  }
};

// GET /api/v1/location/me – return authenticated user's latest location, 404 if none yet.
export const getMyLocation = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT id, user_id, latitude, longitude, accuracy, updated_at
       FROM user_locations
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No location recorded yet.",
      });
    }

    return res.json({ success: true, location: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
