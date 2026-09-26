import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import citizenRoutes from "./routes/citizen.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { query } from "./config/database.js";

dotenv.config({ override: true });

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/citizen", citizenRoutes);

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
