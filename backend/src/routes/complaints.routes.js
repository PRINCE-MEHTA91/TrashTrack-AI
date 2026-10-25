import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { createComplaint, getMyComplaints, deleteComplaint } from "../controllers/complaints.controller.js";
import {
  getCommunityComplaints,
  getComplaintDetails,
  addComplaintComment,
  verifyComplaintWork,
  requestComplaintAction,
} from "../controllers/community-complaints.controller.js";
import { handleSSEConnection } from "../services/realtime.service.js";

const router = Router();

// Real-time SSE stream endpoint (handles token via query or header)
router.get("/events", handleSSEConnection);

// All subsequent routes require JWT authentication
router.use(verifyToken);

// ── Shared Zone Community Complaints Feed (Citizen, Worker, Admin) ──
router.get("/community", requireRole(["citizen", "worker", "admin"]), getCommunityComplaints);
router.get("/:id/details", requireRole(["citizen", "worker", "admin"]), getComplaintDetails);
router.post("/:id/comments", requireRole(["citizen", "worker", "admin"]), addComplaintComment);

// Admin verification and rework actions
router.post("/:id/verify", requireRole(["admin"]), verifyComplaintWork);
router.post("/:id/request-action", requireRole(["admin"]), requestComplaintAction);

// ── Citizen-specific complaint routes ──
router.post("/", requireRole(["citizen"]), createComplaint);
router.get("/me", requireRole(["citizen"]), getMyComplaints);
router.delete("/:id", requireRole(["citizen"]), deleteComplaint);

export default router;
