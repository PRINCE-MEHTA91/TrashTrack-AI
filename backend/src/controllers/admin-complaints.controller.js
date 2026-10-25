import { query } from "../config/database.js";
import { z } from "zod";
import {
  assignComplaintToNearestWorker,
  manualAssignComplaint,
  getComplaintAssignmentLogs,
} from "../services/assignment.service.js";
import { broadcastZoneUpdate } from "../services/realtime.service.js";

// Helper to fetch and verify admin municipality
async function getAuthenticatedAdmin(userId) {
  const res = await query(
    `SELECT u.id, u.role, u.full_name, u.email, u.municipality_id,
            m.name as municipality_name, m.district as municipality_district, m.state as municipality_state
     FROM users u
     LEFT JOIN municipalities m ON m.id = u.municipality_id
     WHERE u.id = $1`,
    [userId]
  );
  if (res.rows.length === 0) return null;
  const admin = res.rows[0];
  if (admin.role !== "admin") return null;
  return admin;
}

// GET /api/v1/admin/complaints - Paginated complaints by municipality jurisdiction
export const listAdminComplaints = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const adminMuniId = admin.municipality_id;
    const {
      tab = "all",
      search = "",
      severity,
      waste_type,
      page = "1",
      limit = "25",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    // Base conditions for municipality scoping
    const scopeConditions = [];
    const scopeParams = [];

    if (adminMuniId) {
      scopeParams.push(adminMuniId);
      scopeConditions.push(`c.municipality_id = $${scopeParams.length}`);
    }

    const scopeWhere = scopeConditions.length > 0 ? `WHERE ${scopeConditions.join(" AND ")}` : "";

    // 1. Live summary counts across all 5 sections
    const countsRes = await query(
      `SELECT
         COUNT(DISTINCT c.id) FILTER (WHERE c.status NOT IN ('REJECTED')) AS total_all,
         COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('PENDING', 'SUBMITTED', 'ASSIGNED') AND c.assigned_worker_id IS NOT NULL) AS total_pending,
         COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'IN_PROGRESS') AS total_in_progress,
         COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('RESOLVED', 'COMPLETED', 'CLOSED', 'VERIFIED')) AS total_completed,
         COUNT(DISTINCT c.id) FILTER (WHERE c.assigned_worker_id IS NULL AND c.status NOT IN ('RESOLVED', 'COMPLETED', 'CLOSED', 'VERIFIED', 'REJECTED')) AS total_unassigned
       FROM complaints c
       ${scopeWhere}`,
      scopeParams
    );

    const cRow = countsRes.rows[0] || {};
    const counts = {
      all: Number(cRow.total_all) || 0,
      pending: Number(cRow.total_pending) || 0,
      in_progress: Number(cRow.total_in_progress) || 0,
      resolved: Number(cRow.total_completed) || 0,
      unassigned: Number(cRow.total_unassigned) || 0,
    };

    // 2. Build filtered query for the active tab and search criteria
    const filterConditions = [...scopeConditions];
    const filterParams = [...scopeParams];

    // Status filter by tab
    if (tab === "unassigned") {
      filterConditions.push(`c.assigned_worker_id IS NULL AND c.status NOT IN ('RESOLVED', 'COMPLETED', 'CLOSED', 'VERIFIED', 'REJECTED')`);
    } else if (tab === "pending") {
      filterConditions.push(`c.status IN ('PENDING', 'SUBMITTED', 'ASSIGNED') AND c.assigned_worker_id IS NOT NULL`);
    } else if (tab === "in_progress") {
      filterConditions.push(`c.status = 'IN_PROGRESS'`);
    } else if (tab === "resolved") {
      filterConditions.push(`c.status IN ('RESOLVED', 'COMPLETED', 'CLOSED', 'VERIFIED')`);
    } else {
      filterConditions.push(`c.status NOT IN ('REJECTED')`);
    }

    // Search filter
    if (search && search.trim() !== "") {
      filterParams.push(`%${search.trim()}%`);
      const pIdx = filterParams.length;
      filterConditions.push(`(
        c.title ILIKE $${pIdx} 
        OR c.description ILIKE $${pIdx} 
        OR c.address ILIKE $${pIdx}
        OR cit.full_name ILIKE $${pIdx}
        OR wrk.full_name ILIKE $${pIdx}
      )`);
    }

    // Severity filter
    if (severity && ["LOW", "MEDIUM", "HIGH"].includes(severity.toUpperCase())) {
      filterParams.push(severity.toUpperCase());
      filterConditions.push(`c.severity = $${filterParams.length}`);
    }

    // Waste type filter
    if (waste_type && ["ORGANIC", "PLASTIC", "HAZARDOUS", "BULK", "OTHER"].includes(waste_type.toUpperCase())) {
      filterParams.push(waste_type.toUpperCase());
      filterConditions.push(`c.waste_type = $${filterParams.length}`);
    }

    const whereClause = filterConditions.length > 0 ? `WHERE ${filterConditions.join(" AND ")}` : "";

    // Count total filtered
    const countTotalRes = await query(
      `SELECT COUNT(DISTINCT c.id) AS total
       FROM complaints c
       LEFT JOIN users cit ON cit.id = c.citizen_id
       LEFT JOIN users wrk ON wrk.id = c.assigned_worker_id
       ${whereClause}`,
      filterParams
    );
    const totalFiltered = Number(countTotalRes.rows[0]?.total) || 0;

    // Fetch page of complaints
    const dataParams = [...filterParams, limitNum, offset];
    const dataSql = `
      SELECT
        c.id,
        c.citizen_id,
        c.title,
        c.description,
        c.waste_type,
        c.severity,
        c.latitude,
        c.longitude,
        c.accuracy,
        c.address,
        c.image_url,
        c.status,
        c.assigned_worker_id,
        c.assigned_at,
        c.assignment_distance_meters,
        c.assignment_mode,
        c.worker_response,
        c.worker_response_at,
        c.rejection_reason,
        c.offer_expires_at,
        c.rejected_worker_ids,
        c.resolution_note,
        c.resolution_image_url,
        c.resolved_at,
        c.created_at,
        c.updated_at,
        m.name AS municipality_name,
        m.district AS municipality_district,
        w.name AS ward_name,
        w.ward_number,
        cit.full_name AS citizen_name,
        cit.email AS citizen_email,
        cit.phone_number AS citizen_phone,
        wrk.full_name AS worker_name,
        wrk.email AS worker_email,
        wrk.phone_number AS worker_phone
      FROM complaints c
      LEFT JOIN municipalities m ON m.id = c.municipality_id
      LEFT JOIN wards w ON w.id = c.ward_id
      LEFT JOIN users cit ON cit.id = c.citizen_id
      LEFT JOIN users wrk ON wrk.id = c.assigned_worker_id
      ${whereClause}
      ORDER BY
        CASE
          WHEN c.assigned_worker_id IS NULL THEN 1
          WHEN c.status = 'IN_PROGRESS' THEN 2
          WHEN c.status IN ('PENDING', 'SUBMITTED', 'ASSIGNED') THEN 3
          ELSE 4
        END,
        c.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const dataRes = await query(dataSql, dataParams);

    return res.json({
      success: true,
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

// POST /api/v1/admin/complaints/:id/assign - Manually assign complaint to worker
const manualAssignSchema = z.object({
  workerId: z.string().uuid("Valid workerId UUID is required."),
  notes: z.string().optional(),
});

export const assignComplaintManually = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const { id: complaintId } = req.params;
    const { workerId, notes } = manualAssignSchema.parse(req.body);

    const result = await manualAssignComplaint(admin.id, complaintId, workerId, notes);

    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }

    broadcastZoneUpdate(admin.municipality_id, {
      type: "complaint_assigned",
      complaintId,
      workerId,
    });

    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error.", errors: err.errors });
    }
    next(err);
  }
};

// POST /api/v1/admin/complaints/:id/auto-assign - Auto-assign complaint to nearest worker
export const triggerAutoAssign = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const { id: complaintId } = req.params;
    const result = await assignComplaintToNearestWorker(complaintId);

    broadcastZoneUpdate(admin.municipality_id, {
      type: "complaint_assigned",
      complaintId,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/complaints/:id/logs - Assignment audit trail for complaint
export const getComplaintLogs = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const { id: complaintId } = req.params;
    const logs = await getComplaintAssignmentLogs(complaintId);

    return res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
};
