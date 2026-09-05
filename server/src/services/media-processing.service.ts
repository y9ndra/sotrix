import sharp from "sharp";
import Media, { IMedia } from "../models/media.model";
import { processMedia as processCloudinaryMedia } from "./cloudinary.service";

export const processImage = async (
  inputBuffer: Buffer
): Promise<Buffer> => {
  return sharp(inputBuffer)
    .resize({
      width: 1200,
      withoutEnlargement: true,
    })
    .webp({
      quality: 80,
    })
    .toBuffer();
};

/**
 * Service to handle media processing (resizing, compressing, generating variants)
 * and update the Media document's status.
 */
export const processMediaDocument = async (mediaId: string): Promise<IMedia> => {
  const media = await Media.findById(mediaId);
  if (!media) {
    throw new Error(`Media not found: ${mediaId}`);
  }

  // Idempotency check: If already completed, skip processing
  if (media.status === "completed") {
    console.log(`[MEDIA PROCESSING] Media ${mediaId} is already completed. Skipping.`);
    return media;
  }

  try {
    // Perform heavy processing on Cloudinary
    await processCloudinaryMedia(media.publicId, media.type);

    // Mark as completed on success
    media.status = "completed";
    await media.save();

    return media;
  } catch (error) {
    // Re-throw so worker handles retries & terminal failure
    throw error;
  }
};
