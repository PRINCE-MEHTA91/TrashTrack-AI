import { query } from "../config/database.js";

// Returns the authenticated citizen's report summary stats.
// Returns zeros until the complaints table is ready.
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
