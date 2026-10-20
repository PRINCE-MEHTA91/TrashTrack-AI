import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  getPendingApprovals,
  getPendingApprovalsCount,
  listWorkers,
  getWorkerDetail,
  approveWorker,
  rejectWorker,
  assignComplaintToWorker,
} from "../controllers/workers.controller.js";
import {
  getLiveWorkerAvailability,
  getWorkerWorkingHours,
  adminCloseWorkerSession,
} from "../controllers/worker-availability.controller.js";

const router = Router();

// All worker admin endpoints require valid JWT and verified admin role in database
router.use(verifyToken);
router.use(requireRole(["admin"]));

// Worker live availability & monitoring
router.get("/availability/live", getLiveWorkerAvailability);

// Worker verification and approvals
router.get("/pending-count", getPendingApprovalsCount);
router.get("/pending", getPendingApprovals);

// Workforce listing
router.get("/", listWorkers);

// Worker-specific working hours & detail
router.get("/:id/working-hours", getWorkerWorkingHours);
router.post("/:id/close-session", adminCloseWorkerSession);
router.get("/:id", getWorkerDetail);
router.post("/:id/approve", approveWorker);
router.post("/:id/reject", rejectWorker);
router.post("/:id/assign-complaint", assignComplaintToWorker);

export default router;

