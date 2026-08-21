import IORedis from "ioredis";

export const bullMQConnection = new IORedis(
  process.env.REDIS_URL!,
  {
    maxRetriesPerRequest: null,
  }
);
