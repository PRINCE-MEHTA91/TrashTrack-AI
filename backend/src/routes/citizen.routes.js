import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { getCitizenStats } from "../controllers/citizen.controller.js";

const router = Router();

// All citizen routes require a valid JWT AND the citizen role.
// A worker or admin JWT will receive 403 Forbidden.
router.use(verifyToken);
router.use(requireRole(["citizen"]));

/** GET /api/v1/citizen/stats – citizen's own report statistics */
router.get("/stats", getCitizenStats);

export default router;
