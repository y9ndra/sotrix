import mongoose from "mongoose";

export async function connectDB(){
const mongo_url = process.env.DATABASE_URL;

mongoose.connect(mongo_url as string)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
}