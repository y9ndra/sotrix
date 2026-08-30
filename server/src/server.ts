import dotenv from "dotenv";

dotenv.config();

import http from "http";
import app from "./app";
import { connectDB } from "./config/db";
import { connectRedis } from "./config/redis";
import { startCleanupJob } from "./jobs/cron/cleanup.job";
import { initializeSocket } from "./socket";

const httpServer = http.createServer(app);

const io = initializeSocket(httpServer);

async function startServer() {
  try {
    await connectDB();
    await connectRedis();

    const PORT = process.env.PORT || 5000;

    httpServer.listen(PORT, () => {
      console.log(`Server is running in development mode on port ${PORT}`);

      startCleanupJob();
    });
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

startServer();
