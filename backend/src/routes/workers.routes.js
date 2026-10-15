import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  getPendingApprovals,
  getPendingApprovalsCount,
  listWorkers,
  getWorkerDetail,
  approveWorker,
  rejectWorker,
} from "../controllers/workers.controller.js";

const router = Router();

// All worker admin endpoints require valid JWT and verified admin role in database
router.use(verifyToken);
router.use(requireRole(["admin"]));

// Worker verification and approvals
router.get("/pending-count", getPendingApprovalsCount);
router.get("/pending", getPendingApprovals);
router.get("/:id", getWorkerDetail);
router.post("/:id/approve", approveWorker);
router.post("/:id/reject", rejectWorker);

// Workforce listing
router.get("/", listWorkers);

export default router;
