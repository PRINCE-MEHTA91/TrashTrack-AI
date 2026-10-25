import { query } from "../config/database.js";
import { sendUserNotification, sendUserBadgeUpdate } from "./realtime.service.js";

// Create and deliver a notification to a specific user
export async function createNotification({
  userId,
  title,
  message,
  type,
  category = "COMPLAINT",
  relatedEntityType = null,
  relatedEntityId = null,
  actionUrl = null,
  dedupKey = null,
}) {
  if (!userId || !title || !message || !type) return null;

  try {
    let inserted;
    if (dedupKey) {
      const insRes = await query(
        `INSERT INTO notifications (
          user_id, title, message, type, category,
          related_entity_type, related_entity_id, action_url, dedup_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
        RETURNING *`,
        [userId, title, message, type, category, relatedEntityType, relatedEntityId, actionUrl, dedupKey]
      );
      if (insRes.rows.length === 0) {
        // Already exists with this dedup_key, return existing
        const exRes = await query(`SELECT * FROM notifications WHERE dedup_key = $1`, [dedupKey]);
        return exRes.rows[0] || null;
      }
      inserted = insRes.rows[0];
    } else {
      const insRes = await query(
        `INSERT INTO notifications (
          user_id, title, message, type, category,
          related_entity_type, related_entity_id, action_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [userId, title, message, type, category, relatedEntityType, relatedEntityId, actionUrl]
      );
      inserted = insRes.rows[0];
    }

    // Get updated unread count for badge
    const countRes = await query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    const unreadCount = Number(countRes.rows[0]?.count) || 0;

    // Push real-time SSE event to the user's active client streams
    sendUserNotification(userId, inserted, unreadCount);

    return inserted;
  } catch (err) {
    console.error("Error creating notification:", err);
    return null;
  }
}

// Notify authorized administrators responsible for a given municipality/zone
export async function notifyAdminsForZone(municipalityId, {
  title,
  message,
  type,
  category = "COMPLAINT",
  relatedEntityType = null,
  relatedEntityId = null,
  actionUrl = null,
  dedupKeyPrefix = null,
}) {
  try {
    const adminRes = await query(
      `SELECT id FROM users
       WHERE role = 'admin'
         AND status = 'active'
         AND ($1::uuid IS NULL OR municipality_id = $1::uuid OR municipality_id IS NULL)`,
      [municipalityId]
    );

    const promises = adminRes.rows.map((admin) =>
      createNotification({
        userId: admin.id,
        title,
        message,
        type,
        category,
        relatedEntityType,
        relatedEntityId,
        actionUrl,
        dedupKey: dedupKeyPrefix ? `${dedupKeyPrefix}_admin_${admin.id}` : null,
      })
    );

    return Promise.all(promises);
  } catch (err) {
    console.error("Error notifying zone admins:", err);
    return [];
  }
}

// Fetch paginated notifications with tab filters for a logged-in user
export async function getNotifications({ userId, tab = "all", page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  // Counts by tab
  const countsRes = await query(
    `SELECT
       COUNT(*)::int AS all,
       COUNT(*) FILTER (WHERE is_read = FALSE)::int AS unread,
       COUNT(*) FILTER (WHERE is_read = TRUE)::int AS read
     FROM notifications
     WHERE user_id = $1`,
    [userId]
  );
  const counts = countsRes.rows[0] || { all: 0, unread: 0, read: 0 };

  const conditions = ["user_id = $1"];
  const params = [userId];

  if (tab === "unread") {
    conditions.push("is_read = FALSE");
  } else if (tab === "read") {
    conditions.push("is_read = TRUE");
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  // Filtered total count
  const totalRes = await query(
    `SELECT COUNT(*)::int AS total FROM notifications ${whereClause}`,
    params
  );
  const total = Number(totalRes.rows[0]?.total) || 0;

  // Data query
  const dataParams = [...params, limitNum, offset];
  const dataRes = await query(
    `SELECT * FROM notifications
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return {
    notifications: dataRes.rows,
    unreadCount: counts.unread || 0,
    counts,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
}

// Get unread notification count for a user
export async function getUnreadCount(userId) {
  const res = await query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return Number(res.rows[0]?.count) || 0;
}

// Mark a single notification as read
export async function markNotificationAsRead(userId, notificationId) {
  const res = await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );

  if (res.rows.length === 0) return null;

  const countRes = await query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  const unreadCount = Number(countRes.rows[0]?.count) || 0;

  sendUserBadgeUpdate(userId, unreadCount);

  return { notification: res.rows[0], unreadCount };
}

// Mark all unread notifications as read for a user
export async function markAllNotificationsAsRead(userId) {
  const res = await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND is_read = FALSE
     RETURNING id`,
    [userId]
  );

  sendUserBadgeUpdate(userId, 0);

  return { updatedCount: res.rowCount };
}
