import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { getAdminDashboardSummary } from "../controllers/admin-dashboard.controller.js";

const router = Router();

// All admin dashboard routes require a valid JWT and verified admin role
router.use(verifyToken);
router.use(requireRole(["admin"]));

// GET /api/v1/admin/dashboard/summary
// Returns complaint statistics, citizen/worker counts, and worker verification breakdown
// for the admin's authorised municipality
router.get("/summary", getAdminDashboardSummary);

export default router;
