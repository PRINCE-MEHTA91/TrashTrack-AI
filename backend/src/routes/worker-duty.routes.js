import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  getWorkerAvailability,
  toggleWorkerAvailability,
  workerHeartbeat,
} from "../controllers/worker-availability.controller.js";

const router = Router();

// All worker availability endpoints require authenticated worker session
router.use(verifyToken);
router.use(requireRole(["worker"]));

router.get("/availability", getWorkerAvailability);
router.post("/availability/toggle", toggleWorkerAvailability);
router.post("/availability/heartbeat", workerHeartbeat);

export default router;
