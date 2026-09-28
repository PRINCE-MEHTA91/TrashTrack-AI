import { z } from "zod";
import { query } from "../config/database.js";

const complaintSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  waste_type: z.enum(["ORGANIC", "PLASTIC", "HAZARDOUS", "BULK", "OTHER"]).default("OTHER"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  address: z.string().optional(),
  image_url: z.string().optional(), // usually base64 for now
});

export const createComplaint = async (req, res, next) => {
  try {
    const parsed = complaintSchema.parse(req.body);
    const citizenId = req.user.userId;

    const result = await query(
      `INSERT INTO complaints (
        citizen_id, title, description, waste_type, severity, 
        latitude, longitude, accuracy, address, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        citizenId,
        parsed.title,
        parsed.description,
        parsed.waste_type,
        parsed.severity,
        parsed.latitude,
        parsed.longitude,
        parsed.accuracy,
        parsed.address,
        parsed.image_url,
      ]
    );

    res.status(201).json({ success: true, complaint: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error", errors: err.errors });
    }
    next(err);
  }
};

export const getMyComplaints = async (req, res, next) => {
  try {
    const citizenId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    const result = await query(
      `SELECT * FROM complaints 
       WHERE citizen_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [citizenId, limit]
    );

    res.json({ success: true, complaints: result.rows });
  } catch (err) {
    next(err);
  }
};
