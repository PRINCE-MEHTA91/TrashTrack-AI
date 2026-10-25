import { query } from "../config/database.js";
import { z } from "zod";
import { createNotification } from "../services/notifications.service.js";

/**
 * Helper to fetch and verify the authenticated admin and their assigned municipality.
 * Never trusts frontend-supplied admin/zone IDs.
 */
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

/**
 * GET /api/v1/admin/workers/pending
 * Returns pending worker verification requests matching the admin's assigned municipality/zone,
 * as well as requests where no authorized admin is assigned (needs area-admin assignment).
 */
export const getPendingApprovals = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const adminMuniId = admin.municipality_id;

    let sql;
    let params;

    if (adminMuniId) {
      // Admin has an assigned municipality:
      // Show workers who requested this admin's municipality,
      // PLUS workers who requested an area that has NO assigned admin, or no area specified (needs area-admin assignment).
      sql = `
        SELECT 
          wa.id as approval_id,
          wa.status as verification_status,
          wa.requested_municipality_id,
          wa.rejection_reason,
          wa.requested_at,
          wa.reviewed_at,
          wa.reviewed_by,
          u.id as id,
          u.full_name,
          u.email,
          u.phone_number,
          u.address,
          u.profile_image,
          u.status as user_status,
          u.created_at,
          m.id as muni_id,
          m.name as muni_name,
          m.district as muni_district,
          m.state as muni_state,
          EXISTS(
            SELECT 1 FROM users adm 
            WHERE adm.role = 'admin' 
              AND adm.municipality_id = wa.requested_municipality_id
              AND adm.id != $1
          ) as assigned_to_other_admin
        FROM worker_approvals wa
        JOIN users u ON u.id = wa.worker_id
        LEFT JOIN municipalities m ON m.id = wa.requested_municipality_id
        WHERE wa.status = 'PENDING_VERIFICATION'
          AND (
            wa.requested_municipality_id = $2
            OR wa.requested_municipality_id IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM users adm 
              WHERE adm.role = 'admin' AND adm.municipality_id = wa.requested_municipality_id
            )
          )
        ORDER BY 
          CASE WHEN wa.requested_municipality_id = $2 THEN 0 ELSE 1 END,
          wa.requested_at DESC
      `;
      params = [admin.id, adminMuniId];
    } else {
      // Admin has not set up their municipality yet:
      // Show requests that have no authorized admin, or all unassigned requests.
      sql = `
        SELECT 
          wa.id as approval_id,
          wa.status as verification_status,
          wa.requested_municipality_id,
          wa.rejection_reason,
          wa.requested_at,
          wa.reviewed_at,
          wa.reviewed_by,
          u.id as id,
          u.full_name,
          u.email,
          u.phone_number,
          u.address,
          u.profile_image,
          u.status as user_status,
          u.created_at,
          m.id as muni_id,
          m.name as muni_name,
          m.district as muni_district,
          m.state as muni_state,
          FALSE as assigned_to_other_admin
        FROM worker_approvals wa
        JOIN users u ON u.id = wa.worker_id
        LEFT JOIN municipalities m ON m.id = wa.requested_municipality_id
        WHERE wa.status = 'PENDING_VERIFICATION'
          AND (
            wa.requested_municipality_id IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM users adm 
              WHERE adm.role = 'admin' AND adm.municipality_id = wa.requested_municipality_id
            )
          )
        ORDER BY wa.requested_at DESC
      `;
      params = [];
    }

    const result = await query(sql, params);

    const workers = result.rows.map((row) => {
      const isDirectMatch = Boolean(adminMuniId && row.requested_municipality_id === adminMuniId);
      const needsAreaAdmin = !row.requested_municipality_id || (!isDirectMatch && !row.assigned_to_other_admin);

      return {
        approval_id: row.approval_id,
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        phone_number: row.phone_number || "Not provided",
        address: row.address || "Not provided",
        profile_image: row.profile_image,
        user_status: row.user_status,
        verification_status: row.verification_status,
        rejection_reason: row.rejection_reason,
        requested_municipality_id: row.requested_municipality_id,
        requested_area: row.muni_id
          ? {
              id: row.muni_id,
              name: row.muni_name,
              district: row.muni_district,
              state: row.muni_state,
            }
          : null,
        needs_area_admin_assignment: needsAreaAdmin,
        matches_admin_zone: isDirectMatch,
        requested_at: row.requested_at,
        created_at: row.created_at,
      };
    });

    return res.json({
      success: true,
      admin_municipality: admin.municipality_name
        ? {
            id: admin.municipality_id,
            name: admin.municipality_name,
            district: admin.municipality_district,
            state: admin.municipality_state,
          }
        : null,
      count: workers.length,
      workers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/workers/pending-count
 * Fast endpoint for header notification badge and sidebar badge.
 */
export const getPendingApprovalsCount = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const adminMuniId = admin.municipality_id;

    let sql;
    let params;

    if (adminMuniId) {
      sql = `
        SELECT COUNT(*)::int as count
        FROM worker_approvals wa
        WHERE wa.status = 'PENDING_VERIFICATION'
          AND (
            wa.requested_municipality_id = $1
            OR wa.requested_municipality_id IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM users adm 
              WHERE adm.role = 'admin' AND adm.municipality_id = wa.requested_municipality_id
            )
          )
      `;
      params = [adminMuniId];
    } else {
      sql = `
        SELECT COUNT(*)::int as count
        FROM worker_approvals wa
        WHERE wa.status = 'PENDING_VERIFICATION'
          AND (
            wa.requested_municipality_id IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM users adm 
              WHERE adm.role = 'admin' AND adm.municipality_id = wa.requested_municipality_id
            )
          )
      `;
      params = [];
    }

    const result = await query(sql, params);
    const count = result.rows[0]?.count || 0;

    return res.json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/workers
 * List all workers for the admin dashboard.
 */
export const listWorkers = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const adminMuniId = admin.municipality_id;
    const { status, tab } = req.query;

    let sql = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone_number,
        u.address,
        u.profile_image,
        u.status,
        u.municipality_id,
        u.requested_municipality_id,
        u.created_at,
        u.updated_at,
        wa.id as approval_id,
        COALESCE(wa.status, CASE WHEN u.status = 'active' THEN 'APPROVED' ELSE 'PENDING_VERIFICATION' END) as verification_status,
        wa.rejection_reason,
        wa.requested_at,
        wa.reviewed_at,
        m.name as municipality_name,
        m.district as municipality_district,
        m.state as municipality_state,
        rm.name as requested_municipality_name,
        rm.district as requested_municipality_district,
        rm.state as requested_municipality_state
      FROM users u
      LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
      LEFT JOIN municipalities m ON m.id = u.municipality_id
      LEFT JOIN municipalities rm ON rm.id = COALESCE(wa.requested_municipality_id, u.requested_municipality_id)
      WHERE LOWER(u.role) = 'worker'
    `;

    const conditions = [];
    const params = [];

    // Filter by admin municipality scope if admin has one configured
    if (adminMuniId) {
      params.push(adminMuniId);
      conditions.push(`(u.municipality_id = $${params.length} OR COALESCE(wa.requested_municipality_id, u.requested_municipality_id) = $${params.length} OR (u.municipality_id IS NULL AND COALESCE(wa.requested_municipality_id, u.requested_municipality_id) IS NULL))`);
    }

    // Tab / status filters
    if (tab === "approvals" || status === "pending" || status === "pending_verification") {
      conditions.push(`COALESCE(wa.status, 'PENDING_VERIFICATION') = 'PENDING_VERIFICATION'`);
    } else if (status === "active") {
      conditions.push(`u.status = 'active'`);
    } else if (status === "rejected") {
      conditions.push(`(u.status = 'rejected' OR wa.status = 'REJECTED')`);
    }

    if (conditions.length > 0) {
      sql += ` AND ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY u.created_at DESC`;

    const result = await query(sql, params);

    const workers = result.rows.map((w) => ({
      ...w,
      assigned_area: w.municipality_name
        ? `${w.municipality_name}, ${w.municipality_state || ""}`.trim()
        : null,
      requested_area: w.requested_municipality_name
        ? `${w.requested_municipality_name}, ${w.requested_municipality_state || ""}`.trim()
        : null,
    }));

    return res.json({
      success: true,
      count: workers.length,
      admin_municipality: admin.municipality_id
        ? {
            id: admin.municipality_id,
            name: admin.municipality_name,
            district: admin.municipality_district,
            state: admin.municipality_state,
          }
        : null,
      workers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/workers/:id
 * Worker detail view.
 */
export const getWorkerDetail = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const workerId = req.params.id;

    const sql = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone_number,
        u.address,
        u.profile_image,
        u.status as user_status,
        u.municipality_id,
        u.requested_municipality_id,
        u.created_at,
        u.updated_at,
        wa.id as approval_id,
        COALESCE(wa.status, 'PENDING_VERIFICATION') as verification_status,
        wa.rejection_reason,
        wa.requested_at,
        wa.reviewed_at,
        wa.reviewed_by,
        reviewer.full_name as reviewer_name,
        reviewer.email as reviewer_email,
        m.name as municipality_name,
        m.district as municipality_district,
        m.state as municipality_state,
        rm.name as requested_municipality_name,
        rm.district as requested_municipality_district,
        rm.state as requested_municipality_state
      FROM users u
      LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
      LEFT JOIN users reviewer ON reviewer.id = wa.reviewed_by
      LEFT JOIN municipalities m ON m.id = u.municipality_id
      LEFT JOIN municipalities rm ON rm.id = COALESCE(wa.requested_municipality_id, u.requested_municipality_id)
      WHERE u.id = $1 AND u.role = 'worker'
    `;

    const result = await query(sql, [workerId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    const worker = result.rows[0];

    // Enforce zone authorization: if worker belongs to another admin's municipality, block access
    if (
      admin.municipality_id &&
      worker.municipality_id &&
      worker.municipality_id !== admin.municipality_id
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Worker belongs to another municipal jurisdiction.",
      });
    }

    return res.json({ success: true, worker });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/workers/:id/approve
 * Transactionally approves worker registration, updates verification status to APPROVED,
 * sets user status to 'active', and assigns them to the municipality.
 */
export const approveWorker = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const workerId = req.params.id;

    // Fetch worker & approval state
    const workerRes = await query(
      `SELECT u.id, u.role, u.full_name, u.email, u.status, u.requested_municipality_id,
              wa.id as approval_id, wa.status as verification_status, wa.requested_municipality_id as wa_req_muni
       FROM users u
       LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
       WHERE u.id = $1 AND u.role = 'worker'`,
      [workerId]
    );

    if (workerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    const worker = workerRes.rows[0];
    const requestedMuniId = worker.wa_req_muni || worker.requested_municipality_id;

    // Zone authorization check:
    // If worker requested a municipality that is assigned to a DIFFERENT admin, prevent unauthorized approval
    if (requestedMuniId && admin.municipality_id && requestedMuniId !== admin.municipality_id) {
      const otherAdminRes = await query(
        `SELECT id FROM users WHERE role = 'admin' AND municipality_id = $1 AND id != $2`,
        [requestedMuniId, admin.id]
      );
      if (otherAdminRes.rows.length > 0) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not authorized to approve workers for another administrator's municipality.",
        });
      }
    }

    // Determine target municipality assignment:
    // 1. Admin's assigned municipality (primary)
    // 2. Or the worker's requested municipality
    // 3. Or override from req.body if provided
    let targetMuniId = admin.municipality_id || requestedMuniId || req.body?.municipality_id || null;

    if (!targetMuniId) {
      // If neither admin nor worker has a municipality, check if admin wants to select one
      if (req.body?.municipality_id) {
        targetMuniId = req.body.municipality_id;
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Cannot approve worker without an area assignment. Please configure your municipality in Municipal Operations first or specify a municipality.",
        });
      }
    }

    // Perform approval transactionally
    await query("BEGIN");

    // 1. Update user to active, verified, assigned to municipality
    const updatedUserRes = await query(
      `UPDATE users
       SET status = 'active',
           is_email_verified = TRUE,
           municipality_id = $1,
           requested_municipality_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND role = 'worker'
       RETURNING id, full_name, email, role, status, municipality_id`,
      [targetMuniId, workerId]
    );

    // 2. Update worker_approvals record
    await query(
      `INSERT INTO worker_approvals (worker_id, requested_municipality_id, reviewed_by, status, rejection_reason, reviewed_at)
       VALUES ($1, $2, $3, 'APPROVED', NULL, CURRENT_TIMESTAMP)
       ON CONFLICT (worker_id)
       DO UPDATE SET
         status = 'APPROVED',
         requested_municipality_id = EXCLUDED.requested_municipality_id,
         reviewed_by = EXCLUDED.reviewed_by,
         reviewed_at = CURRENT_TIMESTAMP,
         rejection_reason = NULL`,
      [workerId, targetMuniId, admin.id]
    );

    await query("COMMIT");

    await createNotification({
      userId: workerId,
      title: "Worker Profile Approved!",
      message: "Your registration has been approved by the municipal administration. You can now go on duty and receive task assignments.",
      type: "WORKER_APPROVED",
      category: "WORKFORCE",
      relatedEntityType: "worker_approval",
      relatedEntityId: workerId,
      actionUrl: "/worker/home",
      dedupKey: `worker_approved_${workerId}`,
    });

    return res.json({
      success: true,
      message: `Worker ${worker.full_name} has been approved and assigned to active duty.`,
      worker: updatedUserRes.rows[0],
    });
  } catch (err) {
    try { await query("ROLLBACK"); } catch (_) {}
    next(err);
  }
};

/**
 * POST /api/v1/admin/workers/:id/reject
 * Transactionally rejects worker registration, stores the rejection reason,
 * and keeps the worker ineligible for assignments.
 */
const rejectSchema = z.object({
  reason: z.string().min(3, "Rejection reason must be at least 3 characters long."),
});

export const rejectWorker = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const workerId = req.params.id;
    const { reason } = rejectSchema.parse(req.body);

    // Fetch worker & approval state
    const workerRes = await query(
      `SELECT u.id, u.role, u.full_name, u.email, u.status, u.requested_municipality_id,
              wa.id as approval_id, wa.status as verification_status, wa.requested_municipality_id as wa_req_muni
       FROM users u
       LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
       WHERE u.id = $1 AND u.role = 'worker'`,
      [workerId]
    );

    if (workerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    const worker = workerRes.rows[0];
    const requestedMuniId = worker.wa_req_muni || worker.requested_municipality_id;

    // Zone authorization check
    if (requestedMuniId && admin.municipality_id && requestedMuniId !== admin.municipality_id) {
      const otherAdminRes = await query(
        `SELECT id FROM users WHERE role = 'admin' AND municipality_id = $1 AND id != $2`,
        [requestedMuniId, admin.id]
      );
      if (otherAdminRes.rows.length > 0) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not authorized to act on workers for another administrator's municipality.",
        });
      }
    }

    // Perform rejection transactionally
    await query("BEGIN");

    // 1. Update user to rejected, clear municipality assignment
    const updatedUserRes = await query(
      `UPDATE users
       SET status = 'rejected',
           municipality_id = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND role = 'worker'
       RETURNING id, full_name, email, role, status`,
      [workerId]
    );

    // 2. Update worker_approvals record with rejection reason
    await query(
      `INSERT INTO worker_approvals (worker_id, requested_municipality_id, reviewed_by, status, rejection_reason, reviewed_at)
       VALUES ($1, $2, $3, 'REJECTED', $4, CURRENT_TIMESTAMP)
       ON CONFLICT (worker_id)
       DO UPDATE SET
         status = 'REJECTED',
         reviewed_by = EXCLUDED.reviewed_by,
         reviewed_at = CURRENT_TIMESTAMP,
         rejection_reason = EXCLUDED.rejection_reason`,
      [workerId, requestedMuniId, admin.id, reason]
    );

    await query("COMMIT");

    await createNotification({
      userId: workerId,
      title: "Worker Registration Rejected",
      message: `Your registration request was rejected by administration. Reason: ${reason}`,
      type: "WORKER_REJECTED",
      category: "WORKFORCE",
      relatedEntityType: "worker_approval",
      relatedEntityId: workerId,
      actionUrl: "/worker/profile",
      dedupKey: `worker_rejected_${workerId}`,
    });

    return res.json({
      success: true,
      message: `Worker registration for ${worker.full_name} has been rejected.`,
      worker: updatedUserRes.rows[0],
      rejection_reason: reason,
    });
  } catch (err) {
    try { await query("ROLLBACK"); } catch (_) {}
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error.", errors: err.errors });
    }
    next(err);
  }
};

/**
 * POST /api/v1/admin/workers/:id/assign-complaint
 * Assigns a complaint/task to a verified worker.
 */
export const assignComplaintToWorker = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const { id: workerId } = req.params;
    const { complaintId } = req.body;

    if (!complaintId) {
      return res.status(400).json({ success: false, message: "complaintId is required." });
    }

    // Verify worker exists and is active
    const workerRes = await query(
      `SELECT id, full_name, email, role, status, municipality_id FROM users WHERE id = $1 AND role = 'worker'`,
      [workerId]
    );
    if (workerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }
    const worker = workerRes.rows[0];

    // Verify complaint exists
    const complaintRes = await query(
      `SELECT id, title, status, municipality_id FROM complaints WHERE id = $1`,
      [complaintId]
    );
    if (complaintRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }
    const complaint = complaintRes.rows[0];

    if (["RESOLVED", "COMPLETED", "CLOSED", "REJECTED"].includes(complaint.status)) {
      return res.status(400).json({ success: false, message: "Cannot assign a resolved or closed complaint." });
    }

    // Update assignment
    const updated = await query(
      `UPDATE complaints
       SET assigned_worker_id = $1,
           status = 'PENDING',
           assigned_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [workerId, complaintId]
    );

    await createNotification({
      userId: workerId,
      title: "New Task Assignment Offer",
      message: `Administrator assigned complaint "${complaint.title}" to you. Review & accept.`,
      type: "TASK_OFFER",
      category: "TASK",
      relatedEntityType: "complaint",
      relatedEntityId: complaintId,
      actionUrl: "/worker/tasks?tab=pending",
      dedupKey: `task_offer_${complaintId}_worker_${workerId}`,
    });

    return res.json({
      success: true,
      message: `Task assigned to ${worker.full_name} successfully.`,
      complaint: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

