import cron from "node-cron";
import { maintenanceQueue } from "../../queues/maintenance.queue";

export const startCleanupJob = () => {
  cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        await maintenanceQueue.add(
          "cleanup-notifications",
          {
            type: "cleanup-notifications",
          }
        );

        console.log(
          "[CRON] Notification cleanup job queued"
        );
      } catch (error) {
        console.error(
          "[CRON] Failed to queue cleanup job:",
          error
        );
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log(
    "[CRON] Notification cleanup scheduler started"
  );
};
