/**
 * classify.routes.js
 *
 * POST /api/v1/classify — Waste image classification via the ML service.
 *
 * Authentication: requires a valid JWT (citizen, worker, or admin).
 * Rate-limiting / additional middleware can be added here without touching
 * any other route file.
 */

import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { classifyWasteImage } from "../controllers/classify.controller.js";

const router = Router();

// All classification requests must be authenticated
router.use(verifyToken);

/**
 * POST /api/v1/classify
 * Body: { image: "<base64 data URL>" }
 *
 * Open to citizens (the primary use-case), workers, and admins.
 */
router.post(
  "/",
  requireRole(["citizen", "worker", "admin"]),
  classifyWasteImage
);

export default router;

