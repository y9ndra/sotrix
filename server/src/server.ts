import dotenv from "dotenv";

dotenv.config();

import http from "http";
import app from "./app";
import { connectDB } from "./config/db";
import { connectRedis } from "./config/redis";
import { startCleanupJob } from "./jobs/cron/cleanup.job";
import { initializeSocket } from "./socket";
import { logger } from "./config/logger";

const httpServer = http.createServer(app);

const io = initializeSocket(httpServer);

async function startServer() {
  try {
    await connectDB();
    await connectRedis();

    // Start inline workers if configured (e.g. single-container deployment on Render free tier)
    if (process.env.RUN_INLINE_WORKER === "true") {
      logger.info("Starting inline BullMQ workers within server process...");
      await import("./workers");
    }

    const PORT = Number(process.env.PORT) || 5000;

    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);

      startCleanupJob();
    });
  } catch (err) {
    logger.error(err, "Failed to start server");
    process.exit(1);
  }
}

startServer();
