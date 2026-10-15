import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  searchOSM,
  discoverWards,
  setupMunicipality,
  getMyMunicipality,
  listMunicipalities
} from "../controllers/municipalities.controller.js";

const router = Router();

router.get("/", listMunicipalities); // List municipalities
router.get("/search", verifyToken, requireRole(["admin"]), searchOSM);
router.get("/discover-wards", verifyToken, requireRole(["admin"]), discoverWards);
router.post("/", verifyToken, requireRole(["admin"]), setupMunicipality);
router.get("/my", verifyToken, getMyMunicipality); // Can be accessed by any authed user

export default router;
