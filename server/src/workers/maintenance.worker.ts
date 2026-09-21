import { Worker } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";
import { logger } from "../config/logger";
import { cleanupOldNotifications } from "../services/cleanup.service";
import type { MaintenanceJobData } from "../queues/maintenance.queue";

export const maintenanceWorker = new Worker<MaintenanceJobData>(
  "maintenance",

  async (job) => {
    switch (job.data.type) {
      case "cleanup-notifications": {
        const deletedCount = await cleanupOldNotifications();

        logger.info(
          { deletedCount },
          `[WORKER] Deleted ${deletedCount} old notifications`
        );

        return {
          deletedCount,
        };
      }

      default:
        throw new Error(
          `Unknown maintenance job: ${job.data.type}`
        );
    }
  },

  {
    connection: bullMQConnection,
    concurrency: 1,
  }
);

maintenanceWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, `[WORKER] Job ${job.id} completed ✅`);
});

maintenanceWorker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, err: error }, `[WORKER] Job failed ❌`);
});

logger.info("Maintenance worker started 🚀");
