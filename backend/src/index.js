import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import citizenRoutes from "./routes/citizen.routes.js";
import locationRoutes from "./routes/location.routes.js";
import complaintsRoutes from "./routes/complaints.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { query } from "./config/database.js";

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
app.use(express.json());

// Health Check Endpoint
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/citizen", citizenRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/complaints", complaintsRoutes);

// Error handling middleware should be last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT}`);
  
  try {
    await query("SELECT 1");
    console.log("Database connected successfully! ✅");
  } catch (err) {
    console.error("Database connection failed ❌:", err.message);
  }
});
