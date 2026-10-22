import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  getWorkerTasks,
  getWorkerTasksSummary,
  getWorkerTaskById,
  startWorkerTask,
  updateTaskProgress,
  completeWorkerTask,
  claimWorkerTask,
  getPendingOffers,
  acceptTaskOffer,
  rejectTaskOffer,
} from "../controllers/worker-tasks.controller.js";

const router = Router();

// All worker task endpoints require a valid JWT with WORKER role
router.use(verifyToken);
router.use(requireRole(["worker"]));

// Task listings & summary
router.get("/summary", getWorkerTasksSummary);
router.get("/pending-offers", getPendingOffers);
router.get("/", getWorkerTasks);

// Offer acceptance / rejection
router.post("/:id/accept", acceptTaskOffer);
router.post("/:id/reject", rejectTaskOffer);

// Single task operations
router.get("/:id", getWorkerTaskById);
router.patch("/:id/start", startWorkerTask);
router.patch("/:id/progress", updateTaskProgress);
router.post("/:id/complete", completeWorkerTask);
router.post("/:id/claim", claimWorkerTask);

export default router;
