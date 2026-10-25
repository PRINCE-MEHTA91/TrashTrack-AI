import { query } from "../config/database.js";
import { z } from "zod";
import { broadcastZoneUpdate } from "../services/realtime.service.js";
import { createNotification, notifyAdminsForZone } from "../services/notifications.service.js";

// Resolves zone from DB profile, GPS/PostGIS, or validated query param
async function resolveUserZone(user, requestedMuniId = null) {
  const userId = user.userId;
  const userRole = user.role;

  const uRes = await query(
    `SELECT u.id, u.role, u.municipality_id, ul.latitude, ul.longitude
     FROM users u
     LEFT JOIN user_locations ul ON ul.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (uRes.rows.length === 0) return { muniId: null, zone: null, wards: [] };
  const u = uRes.rows[0];

  let muniId = null;

  if (userRole === "worker" || userRole === "admin") {
    // Workers & Admins are strictly scoped to their assigned municipality in the DB
    muniId = u.municipality_id || null;
  } else {
    // Citizen zone resolution
    if (u.municipality_id) {
      muniId = u.municipality_id;
    } else if (u.latitude && u.longitude) {
      // Find containing or nearest municipality within 25km
      const spatialRes = await query(
        `SELECT m.id
         FROM municipalities m
         WHERE m.boundary IS NOT NULL AND (
           ST_Contains(m.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
           OR ST_DWithin(m.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 25000)
         )
         ORDER BY 
           CASE WHEN ST_Contains(m.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)) THEN 0 ELSE 1 END,
           ST_Distance(m.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) ASC
         LIMIT 1`,
        [u.longitude, u.latitude]
      );
      if (spatialRes.rows.length > 0) {
        muniId = spatialRes.rows[0].id;
      }
    }

    // If still no zone, or citizen is browsing a selected municipality, validate it on backend
    if (requestedMuniId) {
      const checkMuni = await query(
        `SELECT id FROM municipalities WHERE id = $1`,
        [requestedMuniId]
      );
      if (checkMuni.rows.length > 0) {
        muniId = checkMuni.rows[0].id;
      }
    }
  }

  // Fetch municipality details and wards if muniId resolved
  let zone = null;
  let wards = [];
  if (muniId) {
    const mRes = await query(
      `SELECT id, name, district, state, is_verified FROM municipalities WHERE id = $1`,
      [muniId]
    );
    if (mRes.rows.length > 0) {
      zone = mRes.rows[0];
      const wRes = await query(
        `SELECT id, name, ward_number FROM wards WHERE municipality_id = $1 ORDER BY name ASC`,
        [muniId]
      );
      wards = wRes.rows;
    } else {
      muniId = null;
    }
  }

  return { muniId, zone, wards };
}

// GET /api/v1/complaints/community - Zone-wide feed for citizen, worker, and admin
export const getCommunityComplaints = async (req, res, next) => {
  try {
    const {
      municipality_id: reqMuniId,
      ward_id: reqWardId,
      tab = "all",
      search = "",
      severity,
      waste_type,
      page = "1",
      limit = "25",
    } = req.query;

    const { muniId, zone, wards } = await resolveUserZone(req.user, reqMuniId);

    // Fetch list of all municipalities for zone switching / fallback selection
    const allMunisRes = await query(
      `SELECT id, name, district, state FROM municipalities ORDER BY name ASC`
    );
    const availableMunicipalities = allMunisRes.rows;

    // If user's zone cannot be determined reliably (e.g. unconfigured worker/admin or citizen outside all zones)
    if (!muniId) {
      return res.json({
        success: true,
        zone: null,
        wards: [],
        available_municipalities: availableMunicipalities,
        counts: { all: 0, pending: 0, in_progress: 0, resolved: 0, unassigned: 0 },
        complaints: [],
        pagination: { total: 0, page: 1, limit: 25, pages: 1 },
        message:
          req.user.role === "citizen"
            ? "Please enable GPS location or select your municipality to view your community's complaints."
            : "No municipality zone is assigned to your account yet. Please contact your municipal administrator.",
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    // Base conditions: strictly scoped to the authorized municipality
    const scopeConditions = ["c.municipality_id = $1"];
    const scopeParams = [muniId];

    // Optional ward filtering within this municipality
    if (reqWardId && reqWardId.trim() !== "") {
      scopeParams.push(reqWardId);
      scopeConditions.push(`c.ward_id = $${scopeParams.length}`);
    }

    const scopeWhere = `WHERE ${scopeConditions.join(" AND ")}`;

    // 1. Live counts across all 5 tabs for badge display
    const countsRes = await query(
      `SELECT
         COUNT(DISTINCT c.id) FILTER (WHERE c.status NOT IN ('REJECTED'))                                                   AS total_all,
         COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('PENDING','SUBMITTED','ASSIGNED') AND c.assigned_worker_id IS NOT NULL) AS total_pending,
         COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'IN_PROGRESS')                                                      AS total_in_progress,
         COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('RESOLVED','COMPLETED','CLOSED','VERIFIED'))                      AS total_resolved,
         COUNT(DISTINCT c.id) FILTER (WHERE c.assigned_worker_id IS NULL AND c.status NOT IN ('RESOLVED','COMPLETED','CLOSED','VERIFIED','REJECTED')) AS total_unassigned
       FROM complaints c
       ${scopeWhere}`,
      scopeParams
    );

    const cRow = countsRes.rows[0] || {};
    const counts = {
      all: Number(cRow.total_all) || 0,
      pending: Number(cRow.total_pending) || 0,
      in_progress: Number(cRow.total_in_progress) || 0,
      resolved: Number(cRow.total_resolved) || 0,
      unassigned: Number(cRow.total_unassigned) || 0,
    };

    // 2. Build filtered conditions for active tab and search
    const filterConditions = [...scopeConditions];
    const filterParams = [...scopeParams];

    if (tab === "unassigned") {
      filterConditions.push(
        `c.assigned_worker_id IS NULL AND c.status NOT IN ('RESOLVED','COMPLETED','CLOSED','VERIFIED','REJECTED')`
      );
    } else if (tab === "pending") {
      filterConditions.push(
        `c.status IN ('PENDING','SUBMITTED','ASSIGNED') AND c.assigned_worker_id IS NOT NULL`
      );
    } else if (tab === "in_progress") {
      filterConditions.push(`c.status = 'IN_PROGRESS'`);
    } else if (tab === "resolved") {
      filterConditions.push(`c.status IN ('RESOLVED','COMPLETED','CLOSED','VERIFIED')`);
    } else {
      filterConditions.push(`c.status NOT IN ('REJECTED')`);
    }

    if (search && search.trim() !== "") {
      filterParams.push(`%${search.trim()}%`);
      const pIdx = filterParams.length;
      filterConditions.push(
        `(c.title ILIKE $${pIdx} OR c.description ILIKE $${pIdx} OR c.address ILIKE $${pIdx})`
      );
    }

    if (severity && ["LOW", "MEDIUM", "HIGH"].includes(severity.toUpperCase())) {
      filterParams.push(severity.toUpperCase());
      filterConditions.push(`c.severity = $${filterParams.length}`);
    }

    if (
      waste_type &&
      ["ORGANIC", "PLASTIC", "HAZARDOUS", "BULK", "OTHER"].includes(waste_type.toUpperCase())
    ) {
      filterParams.push(waste_type.toUpperCase());
      filterConditions.push(`c.waste_type = $${filterParams.length}`);
    }

    const whereClause = `WHERE ${filterConditions.join(" AND ")}`;

    // Total filtered count for pagination
    const countTotalRes = await query(
      `SELECT COUNT(DISTINCT c.id) AS total FROM complaints c ${whereClause}`,
      filterParams
    );
    const totalFiltered = Number(countTotalRes.rows[0]?.total) || 0;

    // For role-based flags: push userId twice (for is_my_task and is_my_complaint)
    filterParams.push(req.user.userId);
    const userIdx = filterParams.length;

    const dataParams = [...filterParams, limitNum, offset];

    // Privacy protected query: excludes citizen email and phone numbers
    const dataSql = `
      SELECT
        c.id,
        c.title,
        c.description,
        c.waste_type,
        c.severity,
        c.latitude,
        c.longitude,
        c.accuracy,
        c.address,
        c.image_url,
        c.resolution_image_url,
        c.status,
        c.assigned_worker_id,
        c.assigned_at,
        c.assignment_distance_meters,
        c.assignment_mode,
        c.worker_response,
        c.worker_response_at,
        c.resolution_note,
        c.resolved_at,
        c.verification_notes,
        c.verified_at,
        c.created_at,
        c.updated_at,
        m.id   AS municipality_id,
        m.name AS municipality_name,
        m.district AS municipality_district,
        wd.id  AS ward_id,
        wd.name AS ward_name,
        wd.ward_number,
        -- Permitted public display name of citizen
        cit.full_name AS citizen_name,
        -- Assigned worker's public display name
        wrk.full_name AS assigned_worker_name,
        -- Role-specific flags
        (c.assigned_worker_id = $${userIdx}) AS is_my_task,
        (c.citizen_id = $${userIdx})         AS is_my_complaint,
        -- Latest comment count
        (SELECT COUNT(*)::int FROM complaint_comments cc WHERE cc.complaint_id = c.id) AS comments_count
      FROM complaints c
      LEFT JOIN municipalities m  ON m.id  = c.municipality_id
      LEFT JOIN wards wd          ON wd.id = c.ward_id
      LEFT JOIN users cit         ON cit.id = c.citizen_id
      LEFT JOIN users wrk         ON wrk.id = c.assigned_worker_id
      ${whereClause}
      ORDER BY
        CASE
          WHEN c.status = 'IN_PROGRESS'                          THEN 1
          WHEN c.status IN ('PENDING','SUBMITTED','ASSIGNED')     THEN 2
          WHEN c.assigned_worker_id IS NULL                       THEN 3
          ELSE 4
        END,
        c.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const dataRes = await query(dataSql, dataParams);

    return res.json({
      success: true,
      zone,
      wards,
      available_municipalities: availableMunicipalities,
      counts,
      complaints: dataRes.rows,
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalFiltered / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/complaints/:id/details - Single complaint detail, timeline, and comments
export const getComplaintDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const cRes = await query(
      `SELECT
        c.*,
        m.name AS municipality_name,
        m.district AS municipality_district,
        m.state AS municipality_state,
        wd.name AS ward_name,
        wd.ward_number,
        cit.full_name AS citizen_name,
        wrk.full_name AS assigned_worker_name,
        (c.assigned_worker_id = $2) AS is_my_task,
        (c.citizen_id = $2)         AS is_my_complaint
       FROM complaints c
       LEFT JOIN municipalities m  ON m.id  = c.municipality_id
       LEFT JOIN wards wd          ON wd.id = c.ward_id
       LEFT JOIN users cit         ON cit.id = c.citizen_id
       LEFT JOIN users wrk         ON wrk.id = c.assigned_worker_id
       WHERE c.id = $1`,
      [id, userId]
    );

    if (cRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const complaint = cRes.rows[0];

    // Privacy safeguard: strip citizen contact details unless user is an authorized admin
    if (userRole !== "admin") {
      delete complaint.citizen_email;
      delete complaint.citizen_phone;
    }

    // Fetch comments for this complaint
    const commentsRes = await query(
      `SELECT
        cc.id,
        cc.comment_type,
        cc.comment,
        cc.created_at,
        u.full_name AS author_name,
        u.role      AS author_role,
        (u.id = $2) AS is_my_comment
       FROM complaint_comments cc
       JOIN users u ON u.id = cc.user_id
       WHERE cc.complaint_id = $1
       ORDER BY cc.created_at ASC`,
      [id, userId]
    );

    // Fetch assignment logs for status history
    const logsRes = await query(
      `SELECT
        cal.id,
        cal.status,
        cal.assigned_by,
        cal.distance_meters,
        cal.notes,
        cal.created_at,
        w.full_name AS worker_name,
        adm.full_name AS admin_name
       FROM complaint_assignment_logs cal
       LEFT JOIN users w ON w.id = cal.worker_id
       LEFT JOIN users adm ON adm.id = cal.admin_id
       WHERE cal.complaint_id = $1
       ORDER BY cal.created_at ASC`,
      [id]
    );

    // Build timeline milestones
    const timeline = [];

    // Milestone 1: Submission
    timeline.push({
      id: "submitted",
      type: "SUBMITTED",
      title: "Complaint Raised",
      description: `Reported by ${complaint.citizen_name || "Citizen"} in ${complaint.ward_name || complaint.municipality_name || "Zone"}`,
      timestamp: complaint.created_at,
      status: "COMPLETED",
    });

    // Milestone 2: Assignment / Worker Response
    if (complaint.assigned_at) {
      timeline.push({
        id: "assigned",
        type: "ASSIGNED",
        title: complaint.assigned_worker_name
          ? `Assigned to ${complaint.assigned_worker_name}`
          : "Worker Assigned",
        description: complaint.assignment_mode === "SYSTEM_AUTO"
          ? `Automatically matched to nearest available worker (${complaint.assignment_distance_meters ? Math.round(complaint.assignment_distance_meters) + "m away" : ""})`
          : "Assigned by Municipal Administrator",
        timestamp: complaint.assigned_at,
        status: "COMPLETED",
      });
    }

    // Milestone 3: In Progress
    if (["IN_PROGRESS", "RESOLVED", "COMPLETED", "CLOSED", "VERIFIED"].includes(complaint.status)) {
      timeline.push({
        id: "in_progress",
        type: "IN_PROGRESS",
        title: "Cleanup In Progress",
        description: complaint.resolution_note || "Worker is actively attending to this waste cleanup site.",
        timestamp: complaint.worker_response_at || complaint.updated_at,
        status: "COMPLETED",
      });
    }

    // Milestone 4: Resolution / Completion
    if (["RESOLVED", "COMPLETED", "CLOSED", "VERIFIED"].includes(complaint.status)) {
      timeline.push({
        id: "resolved",
        type: "RESOLVED",
        title: "Cleanup Completed",
        description: complaint.resolution_note || "Worker marked this complaint resolved.",
        timestamp: complaint.resolved_at || complaint.updated_at,
        status: "COMPLETED",
        photoUrl: complaint.resolution_image_url,
      });
    }

    // Milestone 5: Verification
    if (complaint.status === "VERIFIED" || complaint.verified_at) {
      timeline.push({
        id: "verified",
        type: "VERIFIED",
        title: "Work Verified by Administration",
        description: complaint.verification_notes || "Inspection passed. Resolution verified.",
        timestamp: complaint.verified_at || complaint.updated_at,
        status: "COMPLETED",
      });
    }

    return res.json({
      success: true,
      complaint,
      comments: commentsRes.rows,
      assignment_logs: logsRes.rows,
      timeline,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/complaints/:id/comments - Post comment or incomplete report
const commentSchema = z.object({
  comment: z.string().trim().min(2, "Comment must be at least 2 characters."),
  comment_type: z.enum(["COMMENT", "INCOMPLETE_REPORT", "STATUS_UPDATE"]).default("COMMENT"),
});

export const addComplaintComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const parsed = commentSchema.parse(req.body);

    // Verify complaint exists and get its zone
    const cRes = await query(
      `SELECT id, title, status, municipality_id, citizen_id, assigned_worker_id FROM complaints WHERE id = $1`,
      [id]
    );

    if (cRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const complaint = cRes.rows[0];

    // Insert comment
    const insRes = await query(
      `INSERT INTO complaint_comments (complaint_id, user_id, comment_type, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, userId, parsed.comment_type, parsed.comment]
    );

    const insertedComment = insRes.rows[0];

    // If citizen reports incomplete cleanup on a resolved complaint, flag or reopen
    if (parsed.comment_type === "INCOMPLETE_REPORT") {
      await query(
        `UPDATE complaints
         SET status = 'IN_PROGRESS',
             resolution_note = COALESCE(resolution_note, '') || E'\n[Incomplete Reported by Citizen]: ' || $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [parsed.comment, id]
      );

      // Notify assigned worker about incomplete report
      if (complaint.assigned_worker_id) {
        await createNotification({
          userId: complaint.assigned_worker_id,
          title: "Incomplete Cleanup Reported",
          message: `Citizen reported incomplete cleanup on "${complaint.title}": "${parsed.comment}". Flagged for rework.`,
          type: "INCOMPLETE_REPORT",
          category: "TASK",
          relatedEntityType: "complaint",
          relatedEntityId: id,
          actionUrl: "/worker/tasks?tab=in_progress",
        });
      }

      // Notify zone admins
      await notifyAdminsForZone(complaint.municipality_id, {
        title: "Citizen Incomplete Cleanup Report",
        message: `Citizen reported incomplete work on "${complaint.title}": "${parsed.comment}".`,
        type: "INCOMPLETE_REPORT",
        category: "COMPLAINT",
        relatedEntityType: "complaint",
        relatedEntityId: id,
        actionUrl: "/admin/complaints",
      });
    } else {
      // Regular comment: notify citizen if someone else commented
      if (complaint.citizen_id && userId !== complaint.citizen_id) {
        await createNotification({
          userId: complaint.citizen_id,
          title: "New Response to Your Complaint",
          message: `A new comment was posted on "${complaint.title}": "${parsed.comment}"`,
          type: "COMMENT_ADDED",
          category: "COMPLAINT",
          relatedEntityType: "complaint",
          relatedEntityId: id,
          actionUrl: "/citizen/complaints",
        });
      }
      // Notify assigned worker if someone else commented
      if (complaint.assigned_worker_id && userId !== complaint.assigned_worker_id) {
        await createNotification({
          userId: complaint.assigned_worker_id,
          title: "New Comment on Assigned Task",
          message: `A new comment was posted on "${complaint.title}": "${parsed.comment}"`,
          type: "COMMENT_ADDED",
          category: "TASK",
          relatedEntityType: "complaint",
          relatedEntityId: id,
          actionUrl: "/worker/tasks",
        });
      }
    }

    // Broadcast real-time zone update
    broadcastZoneUpdate(complaint.municipality_id, {
      type: "comment_added",
      complaintId: id,
      commentType: parsed.comment_type,
    });

    return res.status(201).json({
      success: true,
      message: parsed.comment_type === "INCOMPLETE_REPORT"
        ? "Incomplete cleanup reported. Complaint has been flagged for worker rework."
        : "Comment posted successfully.",
      comment: insertedComment,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error.", errors: err.errors });
    }
    next(err);
  }
};

// POST /api/v1/complaints/:id/verify - Admin verifies completed cleanup
const verifySchema = z.object({
  notes: z.string().optional().default("Verified and approved by administration."),
});

export const verifyComplaintWork = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only administrators can verify work." });
    }

    const { id } = req.params;
    const { notes } = verifySchema.parse(req.body);
    const adminId = req.user.userId;

    const cRes = await query(
      `SELECT id, title, status, municipality_id, citizen_id, assigned_worker_id FROM complaints WHERE id = $1`,
      [id]
    );

    if (cRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const complaint = cRes.rows[0];

    // Update status to VERIFIED
    const updateRes = await query(
      `UPDATE complaints
       SET status = 'VERIFIED',
           verification_notes = $1,
           verified_at = CURRENT_TIMESTAMP,
           verified_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [notes, adminId, id]
    );

    // Insert comment record
    await query(
      `INSERT INTO complaint_comments (complaint_id, user_id, comment_type, comment)
       VALUES ($1, $2, 'VERIFICATION', $3)`,
      [id, adminId, `[Verified by Admin]: ${notes}`]
    );

    // Insert assignment / audit log
    await query(
      `INSERT INTO complaint_assignment_logs (complaint_id, assigned_by, admin_id, status, notes)
       VALUES ($1, 'ADMIN', $2, 'VERIFIED', $3)`,
      [id, adminId, notes]
    );

    broadcastZoneUpdate(complaint.municipality_id, {
      type: "complaint_verified",
      complaintId: id,
      status: "VERIFIED",
    });

    // Notify assigned worker that cleanup was verified
    if (complaint.assigned_worker_id) {
      await createNotification({
        userId: complaint.assigned_worker_id,
        title: "Work Verified by Administration",
        message: `Your cleanup work on "${complaint.title}" has been verified and approved by administration.`,
        type: "COMPLAINT_VERIFIED",
        category: "TASK",
        relatedEntityType: "complaint",
        relatedEntityId: id,
        actionUrl: "/worker/tasks?tab=completed",
        dedupKey: `verified_${id}`,
      });
    }

    // Notify citizen that cleanup was inspected and verified
    if (complaint.citizen_id) {
      await createNotification({
        userId: complaint.citizen_id,
        title: "Complaint Resolution Verified",
        message: `Administration has verified the completed cleanup of "${complaint.title}".`,
        type: "COMPLAINT_VERIFIED",
        category: "COMPLAINT",
        relatedEntityType: "complaint",
        relatedEntityId: id,
        actionUrl: "/citizen/complaints",
        dedupKey: `verified_${id}`,
      });
    }

    return res.json({
      success: true,
      message: "Complaint resolution verified successfully.",
      complaint: updateRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/complaints/:id/request-action - Admin requests rework / reopens complaint
const requestActionSchema = z.object({
  notes: z.string().min(2, "Notes describing the required rework are required."),
  targetStatus: z.enum(["IN_PROGRESS", "PENDING"]).default("IN_PROGRESS"),
});

export const requestComplaintAction = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only administrators can request action." });
    }

    const { id } = req.params;
    const { notes, targetStatus } = requestActionSchema.parse(req.body);
    const adminId = req.user.userId;

    const cRes = await query(
      `SELECT id, title, status, municipality_id, citizen_id, assigned_worker_id FROM complaints WHERE id = $1`,
      [id]
    );

    if (cRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const complaint = cRes.rows[0];

    const updateRes = await query(
      `UPDATE complaints
       SET status = $1,
           resolution_note = COALESCE(resolution_note, '') || E'\n[Admin Requested Action]: ' || $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [targetStatus, notes, id]
    );

    await query(
      `INSERT INTO complaint_comments (complaint_id, user_id, comment_type, comment)
       VALUES ($1, $2, 'STATUS_UPDATE', $3)`,
      [id, adminId, `[Admin Reopened / Requested Action]: ${notes}`]
    );

    broadcastZoneUpdate(complaint.municipality_id, {
      type: "status_changed",
      complaintId: id,
      status: targetStatus,
    });

    // Notify assigned worker that rework was requested
    if (complaint.assigned_worker_id) {
      await createNotification({
        userId: complaint.assigned_worker_id,
        title: "Action / Rework Requested by Admin",
        message: `Administrator requested rework on "${complaint.title}": "${notes}"`,
        type: "REWORK_REQUESTED",
        category: "TASK",
        relatedEntityType: "complaint",
        relatedEntityId: id,
        actionUrl: "/worker/tasks?tab=in_progress",
      });
    }

    // Notify citizen that administrator reopened complaint for rework
    if (complaint.citizen_id) {
      await createNotification({
        userId: complaint.citizen_id,
        title: "Complaint Reopened for Rework",
        message: `Administrator reviewed "${complaint.title}" and requested further cleanup action.`,
        type: "REWORK_REQUESTED",
        category: "COMPLAINT",
        relatedEntityType: "complaint",
        relatedEntityId: id,
        actionUrl: "/citizen/complaints",
      });
    }

    return res.json({
      success: true,
      message: `Complaint status updated to ${targetStatus}. Worker alerted for rework.`,
      complaint: updateRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};
