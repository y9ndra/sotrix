import cron from "node-cron";
import { cleanupOldNotifications } from "../../services/cleanup.service";

export const startCleanupJob = () => {
  cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        console.log("[CRON] Starting notification cleanup...");
        const deletedCount = await cleanupOldNotifications();
        console.log(`[CRON] Deleted ${deletedCount} old notifications`);
      } catch (error) {
        console.error("[CRON] Notification cleanup failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("[CRON] Notification cleanup job scheduled");
};
