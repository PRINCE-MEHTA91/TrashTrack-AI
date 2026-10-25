import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  listNotifications,
  getUnreadNotificationsCount,
  markSingleNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notifications.controller.js";

const router = Router();

router.use(verifyToken);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadNotificationsCount);
router.patch("/:id/read", markSingleNotificationRead);
router.post("/mark-all-read", markAllNotificationsRead);

export default router;
