import { query } from "../config/database.js";

/**
 * GET /api/v1/citizen/stats
 * Returns the authenticated citizen's report summary stats.
 *
 * Role protection is enforced upstream by verifyToken + requireRole(['citizen']).
 * Never trusts any role/userId value from the request body or query string.
 *
 * Note: The complaints table does not exist yet.
 * This controller returns safe zeros until the table is created.
 * Replace the zero-stub block with the real query once the complaints table is ready.
 */
export const getCitizenStats = async (req, res, next) => {
  try {
    const citizenId = req.user.userId;

    const result = await query(
      `SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING' OR status = 'SUBMITTED')       AS pending,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')   AS in_progress,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED','VERIFIED')) AS resolved
      FROM complaints
      WHERE citizen_id = $1`,
      [citizenId]
    );
    const row = result.rows[0];
    return res.json({
      success: true,
      stats: {
        totalReports:      Number(row.total) || 0,
        pendingReports:    Number(row.pending) || 0,
        inProgressReports: Number(row.in_progress) || 0,
        resolvedReports:   Number(row.resolved) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};
