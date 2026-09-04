import mongoose from "mongoose";
import Media, { IMedia } from "../models/media.model";
import { uploadImage } from "./cloudinary.service";
import { addMediaProcessingJob } from "../queues/media.queue";

export interface UploadMediaParams {
  userId: string | mongoose.Types.ObjectId;
  buffer: Buffer;
  folder?: string;
  type?: "image" | "video";
}

export const uploadAndCreateMedia = async ({
  userId,
  buffer,
  folder = "sotrix/media",
  type = "image",
}: UploadMediaParams): Promise<IMedia> => {
  // 1. Upload initial file to Cloudinary
  const uploadResult = await uploadImage(buffer, folder);

  // 2. Save Media document in MongoDB with 'processing' status
  const media = await Media.create({
    user: userId,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    type,
    status: "processing",
  });

  // 3. Add background processing job to BullMQ queue
  await addMediaProcessingJob(media._id.toString());

  return media;
};

export const getMediaStatus = async (mediaId: string): Promise<IMedia | null> => {
  return Media.findById(mediaId);
};
