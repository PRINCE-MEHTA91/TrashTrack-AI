import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { upsertLocation, getMyLocation } from "../controllers/location.controller.js";

const router = Router();

// All location routes require a valid JWT.
// userId is extracted server-side from the JWT — never from request body.
router.use(verifyToken);

/** POST /api/v1/location – store/update the authenticated user's location */
router.post("/", upsertLocation);

/** GET /api/v1/location/me – retrieve the authenticated user's latest location */
router.get("/me", getMyLocation);

export default router;
