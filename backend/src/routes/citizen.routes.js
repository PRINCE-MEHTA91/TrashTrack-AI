import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { getCitizenStats } from "../controllers/citizen.controller.js";

const router = Router();

router.use(verifyToken);
router.use(requireRole(["citizen"]));

// Get citizen's own report statistics
router.get("/stats", getCitizenStats);

export default router;
