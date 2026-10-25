import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notifications.service.js";

// GET /api/v1/notifications - List paginated notifications for authenticated user
export const listNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { tab = "all", page = "1", limit = "20" } = req.query;

    const result = await getNotifications({
      userId,
      tab,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/notifications/unread-count - Fast endpoint for navbar notification badge
export const getUnreadNotificationsCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const count = await getUnreadCount(userId);
    res.json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/:id/read - Mark single notification as read
export const markSingleNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await markNotificationAsRead(userId, id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    res.json({
      success: true,
      notification: result.notification,
      unreadCount: result.unreadCount,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/notifications/mark-all-read - Mark all user notifications as read
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      message: "All notifications marked as read.",
      updatedCount: result.updatedCount,
      unreadCount: 0,
    });
  } catch (err) {
    next(err);
  }
};
