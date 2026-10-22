import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  listAdminComplaints,
  assignComplaintManually,
  triggerAutoAssign,
  getComplaintLogs,
} from "../controllers/admin-complaints.controller.js";

const router = Router();

// All routes require authenticated Admin
router.use(verifyToken);
router.use(requireRole(["admin"]));

// GET /api/v1/admin/complaints - List complaints with tabs & filters
router.get("/", listAdminComplaints);

// POST /api/v1/admin/complaints/:id/assign - Manual assignment
router.post("/:id/assign", assignComplaintManually);

// POST /api/v1/admin/complaints/:id/auto-assign - Trigger auto assignment
router.post("/:id/auto-assign", triggerAutoAssign);

// GET /api/v1/admin/complaints/:id/logs - Audit logs
router.get("/:id/logs", getComplaintLogs);

export default router;
