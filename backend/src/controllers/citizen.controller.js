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

    // TODO: Replace with real query once complaints table exists:
    // const result = await query(
    //   `SELECT
    //     COUNT(*)                                          AS total,
    //     COUNT(*) FILTER (WHERE status = 'PENDING')       AS pending,
    //     COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')   AS in_progress,
    //     COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED','VERIFIED')) AS resolved
    //   FROM complaints
    //   WHERE citizen_id = $1`,
    //   [citizenId]
    // );
    // const row = result.rows[0];
    // return res.json({
    //   success: true,
    //   stats: {
    //     totalReports:      Number(row.total),
    //     pendingReports:    Number(row.pending),
    //     inProgressReports: Number(row.in_progress),
    //     resolvedReports:   Number(row.resolved),
    //   },
    // });

    // Temporary stub – returns zeros until complaints table exists
    return res.json({
      success: true,
      stats: {
        totalReports:      0,
        pendingReports:    0,
        inProgressReports: 0,
        resolvedReports:   0,
      },
      _note: "Stats will be live once the complaints table is created.",
    });
  } catch (err) {
    next(err);
  }
};
