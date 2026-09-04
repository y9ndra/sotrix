import "dotenv/config";
import { connectDB } from "../config/db";

// Connect to MongoDB
connectDB().catch((err) => {
  console.error("Failed to connect to MongoDB in worker process:", err);
  process.exit(1);
});

// Import workers to start them
import "./notification.worker";
import "./maintenance.worker";
import "./media.worker";
