import { query } from "../config/database.js";
import { createNotification } from "../services/notifications.service.js";

/**
 * Format duration in seconds into short human-readable string (e.g. "7 hrs 15 mins", "45 mins")
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0 mins";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs === 0) return `${mins} min${mins === 1 ? "" : "s"}`;
  if (mins === 0) return `${hrs} hr${hrs === 1 ? "" : "s"}`;
  return `${hrs} hr${hrs === 1 ? "" : "s"} ${mins} min${mins === 1 ? "" : "s"}`;
}

/**
 * Format duration in seconds into words (e.g. "7 hours 15 minutes", "3 hours 30 minutes")
 */
export function formatDurationWords(seconds) {
  if (!seconds || seconds <= 0) return "0 minutes";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs === 0) return `${mins} minute${mins === 1 ? "" : "s"}`;
  if (mins === 0) return `${hrs} hour${hrs === 1 ? "" : "s"}`;
  return `${hrs} hour${hrs === 1 ? "" : "s"} ${mins} minute${mins === 1 ? "" : "s"}`;
}

/**
 * Format timestamp to 12-hour time string with AM/PM (e.g. "09:00 AM")
 */
export function formatTime12(dateObj) {
  if (!dateObj) return "—";
  const d = new Date(dateObj);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Helper to fetch and verify the authenticated admin and their assigned municipality.
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
 * Resolves any active session for a worker that spans past midnight or timed out due to inactivity.
 */
export async function resolveActiveSession(workerId) {
  const openRes = await query(
    `SELECT id, worker_id, started_at, work_date, last_heartbeat_at
     FROM worker_sessions
     WHERE worker_id = $1 AND ended_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`,
    [workerId]
  );

  if (openRes.rows.length === 0) {
    await query(
      `UPDATE users
       SET availability_status = 'INACTIVE', current_session_id = NULL
       WHERE id = $1 AND availability_status = 'ACTIVE'`,
      [workerId]
    );
    return null;
  }

  const session = openRes.rows[0];
  const now = new Date();
  const sessionStart = new Date(session.started_at);
  const lastHeartbeat = session.last_heartbeat_at ? new Date(session.last_heartbeat_at) : sessionStart;

  // Max continuous shift without any ping is 12 hours, or 2 hours without heartbeat
  const maxShiftMs = 12 * 60 * 60 * 1000;
  const maxHeartbeatAgeMs = 2 * 60 * 60 * 1000;
  const isTimedOut = (now - sessionStart > maxShiftMs) || (now - lastHeartbeat > maxHeartbeatAgeMs);

  if (isTimedOut) {
    const endTimestamp = new Date(Math.min(now.getTime(), lastHeartbeat.getTime() + 15 * 60 * 1000));
    const durationSec = Math.max(0, Math.floor((endTimestamp - sessionStart) / 1000));
    await query(
      `UPDATE worker_sessions
       SET ended_at = $1, duration_seconds = $2, closure_reason = 'inactivity_timeout', updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [endTimestamp.toISOString(), durationSec, session.id]
    );
    await query(
      `UPDATE users
       SET availability_status = 'INACTIVE', current_session_id = NULL, last_status_change = $1
       WHERE id = $2`,
      [endTimestamp.toISOString(), workerId]
    );
    return null;
  }

  // Check if session crossed midnight boundary
  const dateCheck = await query(`SELECT (CURRENT_DATE > $1::date) as is_next_day`, [session.work_date]);
  if (dateCheck.rows[0]?.is_next_day) {
    // 1. Close session at the end of its work_date (23:59:59.999)
    const splitDateRes = await query(
      `SELECT ($1::date + TIME '23:59:59.999') AT TIME ZONE 'UTC' as end_of_day`,
      [session.work_date]
    );
    const endOfDay = splitDateRes.rows[0].end_of_day;
    const durationFirstSlice = Math.max(0, Math.floor((new Date(endOfDay) - sessionStart) / 1000));

    await query(
      `UPDATE worker_sessions
       SET ended_at = $1, duration_seconds = $2, closure_reason = 'midnight_split', updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [endOfDay, durationFirstSlice, session.id]
    );

    // 2. Open new session slice for current day starting at 00:00:00
    const startOfTodayRes = await query(
      `SELECT CURRENT_DATE::timestamp AT TIME ZONE 'UTC' as start_of_today`
    );
    const startOfToday = startOfTodayRes.rows[0].start_of_today;

    const newSessionRes = await query(
      `INSERT INTO worker_sessions (worker_id, started_at, work_date, last_heartbeat_at)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_TIMESTAMP)
       RETURNING id, worker_id, started_at, work_date, last_heartbeat_at`,
      [workerId, startOfToday]
    );

    const newSession = newSessionRes.rows[0];
    await query(
      `UPDATE users
       SET availability_status = 'ACTIVE', current_session_id = $1, last_status_change = $2
       WHERE id = $3`,
      [newSession.id, startOfToday, workerId]
    );

    return newSession;
  }

  return session;
}

/**
 * Compute worker's today summary including completed sessions and live active session.
 */
export async function getWorkerTodaySummary(workerId) {
  const completedRes = await query(
    `SELECT 
       COALESCE(SUM(duration_seconds), 0)::int as total_seconds,
       COUNT(*)::int as session_count
     FROM worker_sessions
     WHERE worker_id = $1 AND work_date = CURRENT_DATE AND ended_at IS NOT NULL`,
    [workerId]
  );

  const activeRes = await query(
    `SELECT id, started_at,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::int as elapsed_seconds
     FROM worker_sessions
     WHERE worker_id = $1 AND work_date = CURRENT_DATE AND ended_at IS NULL
     ORDER BY started_at DESC LIMIT 1`,
    [workerId]
  );

  const completedSeconds = completedRes.rows[0]?.total_seconds || 0;
  const completedCount = completedRes.rows[0]?.session_count || 0;

  const activeSession = activeRes.rows[0] || null;
  const activeSeconds = activeSession ? Math.max(0, activeSession.elapsed_seconds || 0) : 0;
  const totalSeconds = completedSeconds + activeSeconds;
  const sessionCount = completedCount + (activeSession ? 1 : 0);

  return {
    total_seconds: totalSeconds,
    total_formatted: formatDuration(totalSeconds),
    total_words: formatDurationWords(totalSeconds),
    session_count: sessionCount,
    active_session: activeSession
      ? {
          id: activeSession.id,
          started_at: activeSession.started_at,
          started_at_formatted: formatTime12(activeSession.started_at),
          elapsed_seconds: activeSeconds,
          elapsed_formatted: formatDuration(activeSeconds),
        }
      : null,
  };
}

/**
 * Clean up timed-out sessions across workers in the admin's scope.
 */
async function cleanupStaleSessions(muniId = null) {
  try {
    let sql = `
      SELECT ws.id, ws.worker_id, ws.started_at, ws.last_heartbeat_at
      FROM worker_sessions ws
      JOIN users u ON u.id = ws.worker_id
      WHERE ws.ended_at IS NULL
    `;
    const params = [];
    if (muniId) {
      params.push(muniId);
      sql += ` AND u.municipality_id = $1`;
    }
    const res = await query(sql, params);
    for (const row of res.rows) {
      await resolveActiveSession(row.worker_id);
    }
  } catch (err) {
    console.error("Error during stale session cleanup:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/worker/availability
 * Returns current worker availability state, verification eligibility, active session, and today's summary.
 */
export const getWorkerAvailability = async (req, res, next) => {
  try {
    const workerId = req.user.userId;

    // Fetch user and approval verification state
    const userRes = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.status as user_status,
              u.availability_status, u.current_session_id, u.last_status_change,
              u.municipality_id, m.name as municipality_name,
              COALESCE(wa.status, CASE WHEN u.status = 'active' THEN 'APPROVED' ELSE 'PENDING_VERIFICATION' END) as verification_status,
              wa.rejection_reason
       FROM users u
       LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
       LEFT JOIN municipalities m ON m.id = u.municipality_id
       WHERE u.id = $1`,
      [workerId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    const worker = userRes.rows[0];
    const isApproved =
      (worker.verification_status === "APPROVED" || worker.user_status === "active") &&
      worker.verification_status !== "REJECTED" &&
      worker.user_status !== "rejected";

    // Resolve any stale/spanning session
    await resolveActiveSession(workerId);

    // Compute today's stats
    const todaySummary = await getWorkerTodaySummary(workerId);

    // Reload availability status from DB after resolve
    const refreshedUser = await query(
      `SELECT availability_status, current_session_id, last_status_change FROM users WHERE id = $1`,
      [workerId]
    );

    const currentStatus = refreshedUser.rows[0]?.availability_status || "INACTIVE";
    const lastChange = refreshedUser.rows[0]?.last_status_change || worker.last_status_change;

    return res.json({
      success: true,
      worker_id: worker.id,
      full_name: worker.full_name,
      eligible: isApproved,
      verification_status: worker.verification_status,
      user_status: worker.user_status,
      rejection_reason: worker.rejection_reason,
      municipality_name: worker.municipality_name,
      availability_status: currentStatus,
      is_active: currentStatus === "ACTIVE",
      last_status_change: lastChange,
      current_session: todaySummary.active_session,
      today_summary: {
        total_seconds: todaySummary.total_seconds,
        total_formatted: todaySummary.total_formatted,
        total_words: todaySummary.total_words,
        session_count: todaySummary.session_count,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/worker/availability/toggle
 * Toggle availability: Go Active (available) or Go Inactive (unavailable).
 * Enforces verification/approval check, prevents duplicate active sessions, and records exact durations.
 */
export const toggleWorkerAvailability = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const requestedAction = (req.body?.action || req.body?.status || "").toUpperCase();

    // 1. Validate worker eligibility in DB
    const userRes = await query(
      `SELECT u.id, u.full_name, u.role, u.status as user_status,
              u.availability_status, u.current_session_id,
              COALESCE(wa.status, CASE WHEN u.status = 'active' THEN 'APPROVED' ELSE 'PENDING_VERIFICATION' END) as verification_status,
              wa.rejection_reason
       FROM users u
       LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
       WHERE u.id = $1`,
      [workerId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    const worker = userRes.rows[0];

    // Determine target status
    let targetStatus;
    if (requestedAction === "ACTIVATE" || requestedAction === "ACTIVE") {
      targetStatus = "ACTIVE";
    } else if (requestedAction === "DEACTIVATE" || requestedAction === "INACTIVE") {
      targetStatus = "INACTIVE";
    } else {
      // Toggle
      targetStatus = worker.availability_status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    }

    // 2. Strict eligibility enforcement: Only verified and approved workers can activate
    if (targetStatus === "ACTIVE") {
      if (worker.user_status === "rejected" || worker.verification_status === "REJECTED") {
        return res.status(403).json({
          success: false,
          code: "REGISTRATION_REJECTED",
          message: `Your registration was rejected (${worker.rejection_reason || "Not eligible"}). You cannot go Active.`,
        });
      }
      const isApproved =
        (worker.verification_status === "APPROVED" || worker.user_status === "active") &&
        worker.verification_status !== "REJECTED" &&
        worker.user_status !== "rejected";
      if (!isApproved) {
        return res.status(403).json({
          success: false,
          code: "PENDING_VERIFICATION",
          message:
            "Your worker account is pending verification and approval by a Municipal Administrator. You cannot go Active until approved.",
        });
      }
    }

    // Resolve any stale/spanning session first
    await resolveActiveSession(workerId);

    // Check existing live status
    const liveCheck = await query(
      `SELECT availability_status, current_session_id FROM users WHERE id = $1`,
      [workerId]
    );
    const liveStatus = liveCheck.rows[0]?.availability_status || "INACTIVE";

    // Idempotency: If already in requested status, return current status safely
    if (liveStatus === targetStatus) {
      const summary = await getWorkerTodaySummary(workerId);
      return res.json({
        success: true,
        availability_status: liveStatus,
        is_active: liveStatus === "ACTIVE",
        message:
          liveStatus === "ACTIVE"
            ? "You are currently Active and available for work."
            : "You are currently Inactive.",
        current_session: summary.active_session,
        today_summary: summary,
      });
    }

    if (targetStatus === "ACTIVE") {
      // START NEW SESSION
      await query("BEGIN");

      // Insert new session
      const insertRes = await query(
        `INSERT INTO worker_sessions (worker_id, started_at, work_date, last_heartbeat_at)
         VALUES ($1, CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_TIMESTAMP)
         RETURNING id, started_at, work_date`,
        [workerId]
      );
      const newSession = insertRes.rows[0];

      // Update user availability
      await query(
        `UPDATE users
         SET availability_status = 'ACTIVE',
             current_session_id = $1,
             last_status_change = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newSession.id, workerId]
      );

      await query("COMMIT");

      const summary = await getWorkerTodaySummary(workerId);

      await createNotification({
        userId: workerId,
        title: "Duty Status: On Duty",
        message: "You are now ON DUTY and available to receive nearby waste cleanup task offers.",
        type: "AVAILABILITY_CHANGED",
        category: "WORKFORCE",
        relatedEntityType: "user",
        relatedEntityId: workerId,
        actionUrl: "/worker/home",
      });

      return res.json({
        success: true,
        availability_status: "ACTIVE",
        is_active: true,
        message: "You are now Active and available for work assignments.",
        current_session: {
          id: newSession.id,
          started_at: newSession.started_at,
          started_at_formatted: formatTime12(newSession.started_at),
          elapsed_seconds: 0,
          elapsed_formatted: "0 mins",
        },
        today_summary: summary,
      });
    } else {
      // END CURRENT ACTIVE SESSION
      await query("BEGIN");

      const openRes = await query(
        `SELECT id, started_at, work_date
         FROM worker_sessions
         WHERE worker_id = $1 AND ended_at IS NULL
         ORDER BY started_at DESC
         LIMIT 1
         FOR UPDATE`,
        [workerId]
      );

      if (openRes.rows.length > 0) {
        const currentSession = openRes.rows[0];
        const endedAtRes = await query(
          `UPDATE worker_sessions
           SET ended_at = CURRENT_TIMESTAMP,
               duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::int),
               closure_reason = 'manual',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING duration_seconds, ended_at`,
          [currentSession.id]
        );
      }

      await query(
        `UPDATE users
         SET availability_status = 'INACTIVE',
             current_session_id = NULL,
             last_status_change = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [workerId]
      );

      await query("COMMIT");

      const summary = await getWorkerTodaySummary(workerId);

      await createNotification({
        userId: workerId,
        title: "Duty Status: Off Duty",
        message: "You are now OFF DUTY and will not receive new task assignments.",
        type: "AVAILABILITY_CHANGED",
        category: "WORKFORCE",
        relatedEntityType: "user",
        relatedEntityId: workerId,
        actionUrl: "/worker/home",
      });

      return res.json({
        success: true,
        availability_status: "INACTIVE",
        is_active: false,
        message: "You are now Inactive and unavailable for new work assignments.",
        current_session: null,
        today_summary: summary,
      });
    }
  } catch (err) {
    try { await query("ROLLBACK"); } catch (_) {}
    next(err);
  }
};

/**
 * POST /api/v1/worker/availability/heartbeat
 * Lightweight ping from active worker client to keep session alive.
 */
export const workerHeartbeat = async (req, res, next) => {
  try {
    const workerId = req.user.userId;

    const userRes = await query(
      `SELECT current_session_id, availability_status FROM users WHERE id = $1`,
      [workerId]
    );
    const user = userRes.rows[0];

    if (!user || user.availability_status !== "ACTIVE" || !user.current_session_id) {
      return res.json({ success: true, is_active: false });
    }

    await query(
      `UPDATE worker_sessions
       SET last_heartbeat_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND ended_at IS NULL`,
      [user.current_session_id]
    );

    return res.json({ success: true, is_active: true });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/workers/availability/live
 * Real-time worker monitoring list for the Admin Workforce section.
 * Returns each worker's active/inactive status, session start, today's total duration, and session count.
 */
export const getLiveWorkerAvailability = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const adminMuniId = admin.municipality_id;

    // Run background cleanup for stale sessions in this municipality
    await cleanupStaleSessions(adminMuniId);

    let sql = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone_number,
        u.profile_image,
        u.status as user_status,
        u.availability_status,
        u.last_status_change,
        u.municipality_id,
        u.created_at,
        wa.id as approval_id,
        COALESCE(wa.status, CASE WHEN u.status = 'active' THEN 'APPROVED' ELSE 'PENDING_VERIFICATION' END) as verification_status,
        m.id as muni_id,
        m.name as municipality_name,
        m.district as municipality_district,
        m.state as municipality_state,
        -- Current open session
        curr_s.id as current_session_id,
        curr_s.started_at as current_session_started_at,
        GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - curr_s.started_at))::int) as current_elapsed_seconds,
        -- Today completed stats
        COALESCE(today_stats.completed_seconds, 0)::int as today_completed_seconds,
        COALESCE(today_stats.completed_count, 0)::int as today_completed_count
      FROM users u
      LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
      LEFT JOIN municipalities m ON m.id = u.municipality_id
      LEFT JOIN worker_sessions curr_s ON curr_s.id = u.current_session_id AND curr_s.ended_at IS NULL
      LEFT JOIN (
        SELECT 
          worker_id,
          SUM(duration_seconds)::int as completed_seconds,
          COUNT(*)::int as completed_count
        FROM worker_sessions
        WHERE work_date = CURRENT_DATE AND ended_at IS NOT NULL
        GROUP BY worker_id
      ) today_stats ON today_stats.worker_id = u.id
      WHERE u.role = 'worker'
    `;

    const params = [];

    // Enforce Admin zone authorization
    if (adminMuniId) {
      params.push(adminMuniId);
      sql += ` AND (u.municipality_id = $1 OR wa.requested_municipality_id = $1 OR (u.municipality_id IS NULL AND wa.requested_municipality_id IS NULL))`;
    }

    sql += ` ORDER BY 
      CASE WHEN u.availability_status = 'ACTIVE' THEN 0 ELSE 1 END,
      u.last_status_change DESC NULLS LAST,
      u.full_name ASC`;

    const result = await query(sql, params);

    let activeCount = 0;
    let inactiveCount = 0;

    const workers = result.rows.map((row) => {
      const isActive = row.availability_status === "ACTIVE" && Boolean(row.current_session_id);
      if (isActive) activeCount++;
      else inactiveCount++;

      const activeElapsed = isActive ? (row.current_elapsed_seconds || 0) : 0;
      const totalTodaySeconds = (row.today_completed_seconds || 0) + activeElapsed;
      const totalSessionsToday = (row.today_completed_count || 0) + (isActive ? 1 : 0);

      return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        phone_number: row.phone_number || "Not provided",
        profile_image: row.profile_image,
        user_status: row.user_status,
        verification_status: row.verification_status,
        availability_status: isActive ? "ACTIVE" : "INACTIVE",
        is_active: isActive,
        last_status_change: row.last_status_change,
        last_status_change_formatted: row.last_status_change ? formatTime12(row.last_status_change) : "—",
        municipality: row.municipality_name
          ? {
              id: row.muni_id,
              name: row.municipality_name,
              district: row.municipality_district,
              state: row.municipality_state,
            }
          : null,
        assigned_area: row.municipality_name
          ? `${row.municipality_name}, ${row.municipality_state || ""}`.trim()
          : "Unassigned",
        current_session: isActive
          ? {
              id: row.current_session_id,
              started_at: row.current_session_started_at,
              started_at_formatted: formatTime12(row.current_session_started_at),
              elapsed_seconds: activeElapsed,
              elapsed_formatted: formatDuration(activeElapsed),
            }
          : null,
        today_summary: {
          total_seconds: totalTodaySeconds,
          total_formatted: formatDuration(totalTodaySeconds),
          total_words: formatDurationWords(totalTodaySeconds),
          session_count: totalSessionsToday,
        },
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
      total_workers: workers.length,
      active_count: activeCount,
      inactive_count: inactiveCount,
      server_time: new Date().toISOString(),
      workers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/workers/:id/working-hours
 * Returns date-wise working-hours session breakdown for a specific worker.
 * Supports date query parameter (defaulting to today: YYYY-MM-DD).
 */
export const getWorkerWorkingHours = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const workerId = req.params.id;
    const requestedDate = req.query.date || new Date().toISOString().slice(0, 10);

    // Verify worker exists and check zone authorization
    const workerRes = await query(
      `SELECT u.id, u.full_name, u.email, u.phone_number, u.municipality_id,
              m.name as municipality_name, u.availability_status
       FROM users u
       LEFT JOIN municipalities m ON m.id = u.municipality_id
       WHERE u.id = $1 AND u.role = 'worker'`,
      [workerId]
    );

    if (workerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    const worker = workerRes.rows[0];

    // Enforce zone authorization
    if (admin.municipality_id && worker.municipality_id && worker.municipality_id !== admin.municipality_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Worker belongs to another municipal jurisdiction.",
      });
    }

    // Resolve any stale/spanning session for this worker first
    await resolveActiveSession(workerId);

    // Fetch individual sessions on the requested date
    const sessionsRes = await query(
      `SELECT 
         id,
         started_at,
         ended_at,
         duration_seconds,
         work_date,
         closure_reason,
         CASE 
           WHEN ended_at IS NULL THEN GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::int)
           ELSE duration_seconds
         END as calculated_duration_seconds
       FROM worker_sessions
       WHERE worker_id = $1 AND work_date = $2
       ORDER BY started_at ASC`,
      [workerId, requestedDate]
    );

    let totalDurationSeconds = 0;
    const sessions = sessionsRes.rows.map((s, index) => {
      const durSec = s.calculated_duration_seconds || 0;
      totalDurationSeconds += durSec;
      const isOngoing = !s.ended_at;

      return {
        session_number: index + 1,
        id: s.id,
        started_at: s.started_at,
        started_at_formatted: formatTime12(s.started_at),
        ended_at: s.ended_at,
        ended_at_formatted: isOngoing ? "In Progress" : formatTime12(s.ended_at),
        duration_seconds: durSec,
        duration_formatted: formatDuration(durSec),
        duration_words: formatDurationWords(durSec),
        is_ongoing: isOngoing,
        closure_reason: s.closure_reason,
        closure_reason_label: formatClosureReason(s.closure_reason, isOngoing),
      };
    });

    // Also fetch 7-day historical daily summaries for quick date-picker context
    const historyRes = await query(
      `SELECT 
         work_date,
         COUNT(*)::int as sessions_count,
         SUM(
           CASE 
             WHEN ended_at IS NULL THEN GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::int)
             ELSE duration_seconds
           END
         )::int as total_seconds
       FROM worker_sessions
       WHERE worker_id = $1 AND work_date >= CURRENT_DATE - INTERVAL '14 days'
       GROUP BY work_date
       ORDER BY work_date DESC`,
      [workerId]
    );

    const history = historyRes.rows.map((h) => ({
      work_date: h.work_date.toISOString ? h.work_date.toISOString().slice(0, 10) : String(h.work_date),
      sessions_count: h.sessions_count,
      total_seconds: h.total_seconds || 0,
      total_formatted: formatDuration(h.total_seconds || 0),
      total_words: formatDurationWords(h.total_seconds || 0),
    }));

    return res.json({
      success: true,
      worker: {
        id: worker.id,
        full_name: worker.full_name,
        email: worker.email,
        phone_number: worker.phone_number,
        municipality_name: worker.municipality_name,
        availability_status: worker.availability_status,
      },
      date: requestedDate,
      sessions_count: sessions.length,
      total_active_seconds: totalDurationSeconds,
      total_active_formatted: formatDuration(totalDurationSeconds),
      total_active_words: formatDurationWords(totalDurationSeconds),
      sessions,
      recent_history: history,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/workers/:id/close-session
 * Allows an authorized Admin to safely close an abandoned or stuck session for a worker.
 */
export const adminCloseWorkerSession = async (req, res, next) => {
  try {
    const admin = await getAuthenticatedAdmin(req.user.userId);
    if (!admin) {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }

    const workerId = req.params.id;

    // Verify worker exists and check zone authorization
    const workerRes = await query(
      `SELECT id, full_name, municipality_id, availability_status FROM users WHERE id = $1 AND role = 'worker'`,
      [workerId]
    );
    if (workerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }
    const worker = workerRes.rows[0];

    if (admin.municipality_id && worker.municipality_id && worker.municipality_id !== admin.municipality_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Worker belongs to another municipal jurisdiction.",
      });
    }

    await query("BEGIN");

    const openRes = await query(
      `SELECT id, started_at FROM worker_sessions WHERE worker_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1 FOR UPDATE`,
      [workerId]
    );

    if (openRes.rows.length > 0) {
      const sess = openRes.rows[0];
      await query(
        `UPDATE worker_sessions
         SET ended_at = CURRENT_TIMESTAMP,
             duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::int),
             closure_reason = 'admin_closed',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [sess.id]
      );
    }

    await query(
      `UPDATE users
       SET availability_status = 'INACTIVE', current_session_id = NULL, last_status_change = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [workerId]
    );

    await query("COMMIT");

    return res.json({
      success: true,
      message: `Active session for ${worker.full_name} has been closed by admin.`,
    });
  } catch (err) {
    try { await query("ROLLBACK"); } catch (_) {}
    next(err);
  }
};

function formatClosureReason(reason, isOngoing) {
  if (isOngoing) return "Active (Ongoing)";
  switch (reason) {
    case "manual":
      return "Worker Logged Out / Inactive";
    case "midnight_split":
      return "Day Boundary (Midnight Auto-Split)";
    case "inactivity_timeout":
      return "Automatic Inactivity Timeout";
    case "admin_closed":
      return "Closed by Administrator";
    default:
      return reason || "Completed";
  }
}
