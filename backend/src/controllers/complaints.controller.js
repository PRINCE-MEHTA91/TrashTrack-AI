import { z } from "zod";
import { query } from "../config/database.js";
import { assignComplaintToNearestWorker } from "../services/assignment.service.js";
import { broadcastZoneUpdate } from "../services/realtime.service.js";

const complaintSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  waste_type: z.enum(["ORGANIC", "PLASTIC", "HAZARDOUS", "BULK", "OTHER"]).default("OTHER"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  address: z.string().optional(),
  image_url: z.string().optional(), // usually base64 for now
});

export const createComplaint = async (req, res, next) => {
  try {
    const parsed = complaintSchema.parse(req.body);
    const citizenId = req.user.userId;

    // Use PostGIS to find containing or nearest municipality (within service radius) and ward
    const spatialResult = await query(
      `SELECT 
         m.id as municipality_id,
         w.id as ward_id
       FROM municipalities m
       LEFT JOIN wards w ON w.municipality_id = m.id AND (
         ST_Contains(w.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
         OR ST_DWithin(w.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 25000)
       )
       WHERE m.boundary IS NOT NULL AND (
         ST_Contains(m.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
         OR ST_DWithin(m.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 25000)
       )
       ORDER BY 
         CASE WHEN ST_Contains(m.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)) THEN 0 ELSE 1 END,
         ST_Distance(m.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) ASC
       LIMIT 1`,
      [parsed.longitude, parsed.latitude]
    );
    
    const muniId = spatialResult.rows.length > 0 ? spatialResult.rows[0].municipality_id : null;
    const wardId = spatialResult.rows.length > 0 ? spatialResult.rows[0].ward_id : null;

    const result = await query(
      `INSERT INTO complaints (
        citizen_id, title, description, waste_type, severity, 
        latitude, longitude, accuracy, address, image_url,
        municipality_id, ward_id, status, assignment_mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'SUBMITTED', 'NONE')
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
        muniId,
        wardId,
      ]
    );

    const savedComplaint = result.rows[0];

    // Trigger Automatic Nearest Eligible Worker Assignment
    let assignment = {
      assigned: false,
      worker: null,
      distance_meters: null,
      message: "Awaiting assignment",
    };

    try {
      const autoRes = await assignComplaintToNearestWorker(savedComplaint.id);
      if (autoRes.assigned) {
        assignment = {
          assigned: true,
          worker: autoRes.worker,
          distance_meters: autoRes.distance_meters,
          message: `Automatically assigned to nearest eligible worker (${autoRes.distance_meters}m away)`,
        };
      } else {
        assignment = {
          assigned: false,
          worker: null,
          distance_meters: null,
          message: autoRes.message || "Saved. Queued for municipal administrator assignment.",
        };
      }
    } catch (assignErr) {
      console.error("Auto-assignment error (complaint safely kept as unassigned):", assignErr);
      assignment = {
        assigned: false,
        worker: null,
        distance_meters: null,
        message: "Complaint saved. Manual assignment by administrator available.",
      };
    }

    // Fetch refreshed complaint data (including assigned worker name/info if assigned)
    const freshRes = await query(
      `SELECT 
         c.*,
         w.full_name as worker_name,
         w.phone_number as worker_phone,
         m.name as municipality_name,
         wd.name as ward_name
       FROM complaints c
       LEFT JOIN users w ON w.id = c.assigned_worker_id
       LEFT JOIN municipalities m ON m.id = c.municipality_id
       LEFT JOIN wards wd ON wd.id = c.ward_id
       WHERE c.id = $1`,
      [savedComplaint.id]
    );

    const finalComplaint = freshRes.rows[0] || savedComplaint;

    broadcastZoneUpdate(finalComplaint.municipality_id, {
      type: "complaint_created",
      complaintId: finalComplaint.id,
      municipalityId: finalComplaint.municipality_id,
      wardId: finalComplaint.ward_id,
      status: finalComplaint.status,
      title: finalComplaint.title,
    });

    res.status(201).json({
      success: true,
      complaint: finalComplaint,
      assignment,
    });
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
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await query(
      `SELECT 
         c.*,
         w.full_name as worker_name,
         w.phone_number as worker_phone,
         m.name as municipality_name,
         wd.name as ward_name
       FROM complaints c
       LEFT JOIN users w ON w.id = c.assigned_worker_id
       LEFT JOIN municipalities m ON m.id = c.municipality_id
       LEFT JOIN wards wd ON wd.id = c.ward_id
       WHERE c.citizen_id = $1 
       ORDER BY c.created_at DESC 
       LIMIT $2`,
      [citizenId, limit]
    );

    res.json({ success: true, complaints: result.rows });
  } catch (err) {
    next(err);
  }
};
