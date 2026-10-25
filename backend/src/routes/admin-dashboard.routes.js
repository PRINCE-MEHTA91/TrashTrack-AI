import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { getAdminDashboardSummary } from "../controllers/admin-dashboard.controller.js";

const router = Router();

router.use(verifyToken);
router.use(requireRole(["admin"]));

// Returns complaint statistics, citizen/worker counts, and worker verification breakdown
router.get("/summary", getAdminDashboardSummary);

export default router;
