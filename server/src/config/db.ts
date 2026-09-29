import mongoose from "mongoose";
import { logger } from "./logger";

export async function connectDB() {
  const mongoUrl = process.env.DATABASE_URL || process.env.MONGO_URI;

  if (!mongoUrl) {
    throw new Error("FATAL: DATABASE_URL or MONGO_URI environment variable is missing!");
  }

  return mongoose
    .connect(mongoUrl)
    .then((conn) => {
      const dbName = conn.connection.name;
      const host = conn.connection.host;
      logger.info(`MongoDB connected successfully to database "${dbName}" at [${host}]`);

      if (
        process.env.NODE_ENV !== "production" &&
        (mongoUrl.includes("mongodb.net") || mongoUrl.includes("sotrix-cluster"))
      ) {
        logger.warn(
          "⚠️  CAUTION: Server is in non-production mode while connected to a remote MongoDB cluster!"
        );
      }
    })
    .catch((err) => {
      logger.error(err, "MongoDB connection error");
      throw err;
    });
}