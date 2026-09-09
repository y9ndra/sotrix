import mongoose from "mongoose";

export async function connectDB() {
  const mongoUrl = process.env.DATABASE_URL || process.env.MONGO_URI;

  if (!mongoUrl) {
    throw new Error("FATAL: DATABASE_URL or MONGO_URI environment variable is missing!");
  }

  return mongoose
    .connect(mongoUrl)
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      throw err;
    });
}