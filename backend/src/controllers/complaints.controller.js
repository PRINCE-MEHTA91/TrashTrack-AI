import { z } from "zod";
import { query } from "../config/database.js";
import { assignComplaintToNearestWorker } from "../services/assignment.service.js";
import { broadcastZoneUpdate } from "../services/realtime.service.js";
import { createNotification, notifyAdminsForZone } from "../services/notifications.service.js";

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

    // 1. Notify the citizen who submitted the complaint
    await createNotification({
      userId: citizenId,
      title: "Complaint Submitted",
      message: `Your complaint "${finalComplaint.title}" was submitted successfully.`,
      type: "COMPLAINT_SUBMITTED",
      category: "COMPLAINT",
      relatedEntityType: "complaint",
      relatedEntityId: finalComplaint.id,
      actionUrl: "/citizen/complaints",
      dedupKey: `complaint_submitted_${finalComplaint.id}`,
    });

    // 2. Notify authorized administrators for this zone
    await notifyAdminsForZone(finalComplaint.municipality_id, {
      title: "New Citizen Complaint",
      message: `New complaint "${finalComplaint.title}" reported in ${finalComplaint.ward_name || finalComplaint.municipality_name || "your zone"}.`,
      type: "NEW_COMPLAINT",
      category: "COMPLAINT",
      relatedEntityType: "complaint",
      relatedEntityId: finalComplaint.id,
      actionUrl: "/admin/complaints",
      dedupKeyPrefix: `new_complaint_${finalComplaint.id}`,
    });

    // 3. If auto-assigned, notify assigned worker and update citizen
    if (assignment.assigned && finalComplaint.assigned_worker_id) {
      await createNotification({
        userId: finalComplaint.assigned_worker_id,
        title: "New Task Assignment Offer",
        message: `New task offer for "${finalComplaint.title}" (${assignment.distance_meters ? Math.round(assignment.distance_meters) + "m away" : "nearby"}). Review & accept.`,
        type: "TASK_OFFER",
        category: "TASK",
        relatedEntityType: "complaint",
        relatedEntityId: finalComplaint.id,
        actionUrl: "/worker/tasks?tab=pending",
        dedupKey: `task_offer_${finalComplaint.id}_worker_${finalComplaint.assigned_worker_id}`,
      });

      await createNotification({
        userId: citizenId,
        title: "Worker Assigned",
        message: `Your complaint "${finalComplaint.title}" has been assigned to worker ${finalComplaint.worker_name || "Sanitation Worker"}.`,
        type: "COMPLAINT_ASSIGNED",
        category: "COMPLAINT",
        relatedEntityType: "complaint",
        relatedEntityId: finalComplaint.id,
        actionUrl: "/citizen/complaints",
        dedupKey: `complaint_assigned_${finalComplaint.id}`,
      });
    } else if (!assignment.assigned) {
      // If unassigned, notify admins that manual assignment is needed
      await notifyAdminsForZone(finalComplaint.municipality_id, {
        title: "Unassigned Complaint Alert",
        message: `Complaint "${finalComplaint.title}" has no available worker in service radius. Requires manual assignment.`,
        type: "UNASSIGNED_COMPLAINT",
        category: "COMPLAINT",
        relatedEntityType: "complaint",
        relatedEntityId: finalComplaint.id,
        actionUrl: "/admin/complaints?tab=assignment",
        dedupKeyPrefix: `unassigned_alert_${finalComplaint.id}`,
      });
    }

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

// DELETE /api/v1/complaints/:id - Delete a complaint (strictly only by the citizen who raised it)
export const deleteComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify complaint exists
    const checkRes = await query(
      `SELECT c.id, c.citizen_id, c.title, c.status, c.municipality_id, c.assigned_worker_id
       FROM complaints c
       WHERE c.id = $1`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const complaint = checkRes.rows[0];

    // Ownership check: strictly only the citizen who raised the complaint can delete it
    if (complaint.citizen_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only delete complaints that you created.",
      });
    }

    // Do not allow deleting if the complaint was already verified or closed
    if (["VERIFIED", "CLOSED"].includes(complaint.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a complaint that has already been verified and closed.",
      });
    }

    // 1. Remove notifications associated with this complaint
    await query(
      `DELETE FROM notifications 
       WHERE related_entity_type = 'complaint' AND related_entity_id = $1`,
      [id]
    );

    // 2. If a worker was assigned, notify them that the task was cancelled by the citizen
    if (complaint.assigned_worker_id) {
      await createNotification({
        userId: complaint.assigned_worker_id,
        title: "Task Cancelled by Citizen",
        message: `Complaint "${complaint.title}" was removed by the citizen who submitted it.`,
        type: "TASK_CANCELLED",
        category: "TASK",
        actionUrl: "/worker/tasks",
        dedupKey: `task_cancelled_${id}_worker_${complaint.assigned_worker_id}`,
      });
    }

    // 3. Delete the complaint (complaint_assignment_logs and complaint_comments cascade automatically)
    await query(`DELETE FROM complaints WHERE id = $1`, [id]);

    // 4. Broadcast zone update via SSE so live feeds refresh in real-time
    broadcastZoneUpdate(complaint.municipality_id, {
      type: "complaint_deleted",
      complaintId: id,
      municipalityId: complaint.municipality_id,
    });

    return res.json({
      success: true,
      message: "Complaint successfully deleted.",
      deletedId: id,
    });
  } catch (err) {
    next(err);
  }
};

