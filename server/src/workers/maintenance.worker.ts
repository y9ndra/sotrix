import { Worker } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";
import { cleanupOldNotifications } from "../services/cleanup.service";
import type { MaintenanceJobData } from "../queues/maintenance.queue";

export const maintenanceWorker = new Worker<MaintenanceJobData>(
  "maintenance",

  async (job) => {
    switch (job.data.type) {
      case "cleanup-notifications": {
        const deletedCount = await cleanupOldNotifications();

        console.log(
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
  console.log(`[WORKER] Job ${job.id} completed ✅`);
});

maintenanceWorker.on("failed", (job, error) => {
  console.error(`[WORKER] Job ${job?.id} failed ❌`, error);
});

console.log("Maintenance worker started 🚀");
