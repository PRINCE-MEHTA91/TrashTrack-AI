import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.routes.js";
import citizenRoutes from "./routes/citizen.routes.js";
import locationRoutes from "./routes/location.routes.js";
import complaintsRoutes from "./routes/complaints.routes.js";
import municipalitiesRoutes from "./routes/municipalities.routes.js";
import workersRoutes from "./routes/workers.routes.js";
import workerDutyRoutes from "./routes/worker-duty.routes.js";
import workerTasksRoutes from "./routes/worker-tasks.routes.js";
import adminDashboardRoutes from "./routes/admin-dashboard.routes.js";
import adminComplaintsRoutes from "./routes/admin-complaints.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

import { query } from "./config/database.js";
import { checkRedisHealth, testRedisOperations, closeRedis } from "./config/redis.js";

dotenv.config({ override: true });

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://trash-track-ai.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Middleware: Protected Health Check Authorization
const requireHealthAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const healthTokenHeader = req.headers["x-health-token"];

  // 1. Direct secret match for ops/cli on Render
  const candidateSecret = healthTokenHeader || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
  if (
    candidateSecret &&
    ((process.env.ADMIN_SIGNUP_SECRET && candidateSecret === process.env.ADMIN_SIGNUP_SECRET) ||
     (process.env.JWT_SECRET && candidateSecret === process.env.JWT_SECRET))
  ) {
    return next();
  }

  // 2. JWT verification
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  return res.status(401).json({ error: "Unauthorized" });
};

// Handler for Redis health checks
const handleRedisHealthCheck = async (req, res) => {
  try {
    const redisHealth = await checkRedisHealth();

    // If caller requests temporary key test via query param (e.g. ?test=1)
    if (req.query.test === "1" || req.query.verify === "true") {
      if (!redisHealth.healthy) {
        return res.status(503).json({ redis: "disconnected", operations: "failed" });
      }
      const testResult = await testRedisOperations();
      if (!testResult.success) {
        return res.status(503).json({ redis: "disconnected", operations: "failed" });
      }
      return res.status(200).json({ redis: "connected", operations: "passed" });
    }

    if (redisHealth.healthy) {
      return res.status(200).json({ redis: "connected" });
    } else {
      return res.status(503).json({ redis: "disconnected" });
    }
  } catch {
    return res.status(503).json({ redis: "disconnected" });
  }
};

// General Service Health Check (public for Render deployment/container probes)
app.get("/api/v1/health", async (req, res) => {
  let redisStatus = "disconnected";
  try {
    const redisHealth = await checkRedisHealth();
    if (redisHealth.healthy) redisStatus = "connected";
  } catch {
    redisStatus = "disconnected";
  }

  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      redis: redisStatus,
    },
  });
});

// Protected Redis Health Check Endpoints
app.get("/api/v1/health/redis", requireHealthAuth, handleRedisHealthCheck);
app.get("/api/v1/admin/health/redis", requireHealthAuth, handleRedisHealthCheck);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/citizen", citizenRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/complaints", complaintsRoutes);
app.use("/api/v1/municipalities", municipalitiesRoutes);
app.use("/api/v1/admin/workers", workersRoutes);
app.use("/api/v1/admin/complaints", adminComplaintsRoutes);
app.use("/api/v1/admin/dashboard", adminDashboardRoutes);

app.use("/api/v1/worker/tasks", workerTasksRoutes);
app.use("/api/v1/worker", workerDutyRoutes);
app.use("/api/v1/notifications", notificationsRoutes);

// Error handling middleware should be last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT}`);
  
  try {
    await query("SELECT 1");
    console.log("Database connected successfully! ✅");
  } catch (err) {
    console.error("Database connection failed ❌:", err.message);
  }

  // Redis startup health check
  try {
    const redisHealth = await checkRedisHealth();
    if (redisHealth.healthy) {
      console.log(`Redis connected successfully! ✅ (${redisHealth.clientType}, latency: ${redisHealth.latencyMs}ms)`);
    } else if (!redisHealth.configured) {
      console.log("Redis is not configured (UPSTASH_REDIS_REST_URL/TOKEN not set). Running with PostgreSQL only. ℹ️");
    } else {
      console.warn("Redis connectivity check failed ⚠️ (status: disconnected)");
    }
  } catch (err) {
    console.warn("Redis startup check warning ⚠️");
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await closeRedis();
    console.log("Server and Redis connections closed.");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error("Forcing shutdown after timeout.");
    process.exit(1);
  }, 5000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
