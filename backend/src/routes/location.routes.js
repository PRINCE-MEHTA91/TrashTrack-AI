import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { upsertLocation, getMyLocation } from "../controllers/location.controller.js";

const router = Router();

// All location routes require a valid JWT.
// userId is extracted server-side from the JWT — never from request body.
router.use(verifyToken);

// Store or update authenticated user's location
router.post("/", upsertLocation);

// Retrieve authenticated user's latest location
router.get("/me", getMyLocation);

export default router;
