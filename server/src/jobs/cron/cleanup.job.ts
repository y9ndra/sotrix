import cron from "node-cron";
import { logger } from "../../config/logger";
import { maintenanceQueue } from "../../queues/maintenance.queue";

const queueCleanupJob = async () => {
  try {
    await maintenanceQueue.add(
      "cleanup-notifications",
      {
        type: "cleanup-notifications",
      }
    );

    logger.info("[CRON] Notification cleanup job queued");
  } catch (error) {
    logger.error(error, "[CRON] Failed to queue cleanup job");
  }
};

export const startCleanupJob = () => {
  // Run cleanup once on server startup
  queueCleanupJob();

  // Schedule daily recurring cleanup at 02:00 AM IST
  cron.schedule(
    "0 2 * * *",
    () => {
      queueCleanupJob();
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  logger.info("[CRON] Notification cleanup scheduler started (daily at 02:00 AM IST + on startup)");
};
