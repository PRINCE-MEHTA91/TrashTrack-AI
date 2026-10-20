import { query } from "../config/database.js";

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
 * GET /api/v1/admin/dashboard/summary
 *
 * Returns admin-scoped dashboard statistics for the admin's municipality:
 * - Complaint counts by status
 * - Registered citizen and worker counts
 * - Worker verification breakdown
 *
 * All counts are strictly filtered by the admin's municipality_id.
 * An admin without a municipality_id (super-admin) sees global counts.
 */
export const getAdminDashboardSummary = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const muniId = admin.municipality_id;

    // ── Complaint Statistics ──────────────────────────────────────────────
    // Counts are by the admin's municipality only.
    // Uses DISTINCT on complaint id to prevent double-counting if any joins are added later.
    const complaintSql = muniId
      ? `SELECT
           COUNT(DISTINCT id)                                             AS total,
           COUNT(DISTINCT id) FILTER (WHERE status IN ('PENDING','SUBMITTED'))  AS pending,
           COUNT(DISTINCT id) FILTER (WHERE status = 'IN_PROGRESS')      AS in_progress,
           COUNT(DISTINCT id) FILTER (WHERE status IN ('RESOLVED','CLOSED','VERIFIED')) AS resolved,
           COUNT(DISTINCT id) FILTER (WHERE assigned_worker_id IS NULL
             AND status NOT IN ('RESOLVED','CLOSED','VERIFIED','REJECTED')) AS unassigned
         FROM complaints
         WHERE municipality_id = $1`
      : `SELECT
           COUNT(DISTINCT id)                                             AS total,
           COUNT(DISTINCT id) FILTER (WHERE status IN ('PENDING','SUBMITTED'))  AS pending,
           COUNT(DISTINCT id) FILTER (WHERE status = 'IN_PROGRESS')      AS in_progress,
           COUNT(DISTINCT id) FILTER (WHERE status IN ('RESOLVED','CLOSED','VERIFIED')) AS resolved,
           COUNT(DISTINCT id) FILTER (WHERE assigned_worker_id IS NULL
             AND status NOT IN ('RESOLVED','CLOSED','VERIFIED','REJECTED')) AS unassigned
         FROM complaints`;

    const complaintRes = await query(complaintSql, muniId ? [muniId] : []);
    const c = complaintRes.rows[0];

    // ── User counts ───────────────────────────────────────────────────────
    const userSql = muniId
      ? `SELECT
           COUNT(*) FILTER (WHERE role = 'citizen') AS citizens,
           COUNT(*) FILTER (WHERE role = 'worker')  AS workers
         FROM users
         WHERE municipality_id = $1`
      : `SELECT
           COUNT(*) FILTER (WHERE role = 'citizen') AS citizens,
           COUNT(*) FILTER (WHERE role = 'worker')  AS workers
         FROM users`;

    const userRes = await query(userSql, muniId ? [muniId] : []);
    const u = userRes.rows[0];

    // ── Worker verification breakdown ─────────────────────────────────────
    // Uses worker_approvals table if it exists; gracefully handles missing rows.
    const workerVerifSql = muniId
      ? `SELECT
           COUNT(*) FILTER (WHERE COALESCE(wa.status,'PENDING_VERIFICATION') = 'APPROVED') AS approved,
           COUNT(*) FILTER (WHERE COALESCE(wa.status,'PENDING_VERIFICATION') = 'PENDING_VERIFICATION') AS pending_verification,
           COUNT(*) FILTER (WHERE COALESCE(wa.status,'PENDING_VERIFICATION') = 'REJECTED') AS rejected
         FROM users u
         LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
         WHERE u.role = 'worker' AND u.municipality_id = $1`
      : `SELECT
           COUNT(*) FILTER (WHERE COALESCE(wa.status,'PENDING_VERIFICATION') = 'APPROVED') AS approved,
           COUNT(*) FILTER (WHERE COALESCE(wa.status,'PENDING_VERIFICATION') = 'PENDING_VERIFICATION') AS pending_verification,
           COUNT(*) FILTER (WHERE COALESCE(wa.status,'PENDING_VERIFICATION') = 'REJECTED') AS rejected
         FROM users u
         LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
         WHERE u.role = 'worker'`;

    const verifRes = await query(workerVerifSql, muniId ? [muniId] : []);
    const v = verifRes.rows[0];

    return res.json({
      success: true,
      municipality: admin.municipality_name
        ? {
            id: muniId,
            name: admin.municipality_name,
            district: admin.municipality_district,
            state: admin.municipality_state,
          }
        : null,
      totalComplaints:  Number(c.total)       || 0,
      pending:          Number(c.pending)     || 0,
      inProgress:       Number(c.in_progress) || 0,
      resolved:         Number(c.resolved)    || 0,
      unassigned:       Number(c.unassigned)  || 0,
      totalCitizens:    Number(u.citizens)    || 0,
      totalWorkers:     Number(u.workers)     || 0,
      workersApproved:  Number(v.approved)    || 0,
      workersPending:   Number(v.pending_verification) || 0,
      workersRejected:  Number(v.rejected)    || 0,
    });
  } catch (err) {
    next(err);
  }
};
