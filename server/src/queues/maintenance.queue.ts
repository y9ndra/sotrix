import { Queue } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";

export type MaintenanceJobData = {
  type: "cleanup-notifications";
};

export const maintenanceQueue = new Queue<MaintenanceJobData>(
  "maintenance",
  {
    connection: bullMQConnection,

    defaultJobOptions: {
      attempts: 3,

      backoff: {
        type: "exponential",
        delay: 1000,
      },

      removeOnComplete: {
        count: 50,
        age: 3600,
      },

      removeOnFail: {
        count: 100,
        age: 86400,
      },
    },
  }
);
