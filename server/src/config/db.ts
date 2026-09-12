import mongoose from "mongoose";
import { logger } from "./logger";

export async function connectDB() {
  const mongoUrl = process.env.DATABASE_URL || process.env.MONGO_URI;

  if (!mongoUrl) {
    throw new Error("FATAL: DATABASE_URL or MONGO_URI environment variable is missing!");
  }

  return mongoose
    .connect(mongoUrl)
    .then(() => {
      logger.info("MongoDB connected successfully");
    })
    .catch((err) => {
      logger.error(err, "MongoDB connection error");
      throw err;
    });
}