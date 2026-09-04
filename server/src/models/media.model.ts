import mongoose, { Schema, Document } from "mongoose";

export type MediaStatus = "processing" | "completed" | "failed";
export type MediaType = "image" | "video";

export interface IMedia extends Document {
  user: mongoose.Types.ObjectId;
  url: string;
  publicId: string;
  type: MediaType;
  status: MediaStatus;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["image", "video"],
      default: "image",
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Media = mongoose.model<IMedia>("Media", mediaSchema);

export default Media;
