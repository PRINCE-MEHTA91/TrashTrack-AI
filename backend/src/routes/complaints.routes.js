import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { createComplaint, getMyComplaints } from "../controllers/complaints.controller.js";

const router = Router();

router.use(verifyToken);
router.use(requireRole(["citizen"]));

router.post("/", createComplaint);
router.get("/me", getMyComplaints);

export default router;
