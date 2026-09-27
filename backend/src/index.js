import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import citizenRoutes from "./routes/citizen.routes.js";
import locationRoutes from "./routes/location.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { query } from "./config/database.js";

dotenv.config({ override: true });

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://trash-track-ai.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/citizen", citizenRoutes);
app.use("/api/v1/location", locationRoutes);

// Error handling middleware should be last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  try {
    await query("SELECT 1");
    console.log("Database connected successfully! ✅");
  } catch (err) {
    console.error("Database connection failed ❌:", err.message);
  }
});
