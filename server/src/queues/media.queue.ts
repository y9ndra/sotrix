import { Queue } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";

export interface ProcessMediaJobData {
  mediaId: string;
}

export const mediaQueue = new Queue<ProcessMediaJobData>(
  "media",
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

export const addMediaProcessingJob = (mediaId: string) => {
  return mediaQueue.add(
    "process-media",
    { mediaId },
    {
      jobId: `process-media-${mediaId}`,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );
};
