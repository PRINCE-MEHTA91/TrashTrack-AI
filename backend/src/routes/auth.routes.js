import { Router } from "express";
import {
  signup,
  login,
  getMe,
} from "../controllers/auth.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", verifyToken, getMe);

export default router;

