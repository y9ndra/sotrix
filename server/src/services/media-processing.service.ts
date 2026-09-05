import sharp from "sharp";
import Media, { IMedia } from "../models/media.model";
import {
  uploadBufferToCloudinary,
  processMedia as processCloudinaryMedia,
} from "./cloudinary.service";

export const downloadImageBuffer = async (imageUrl: string): Promise<Buffer> => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText || response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

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

export const processImageFromUrl = async (imageUrl: string): Promise<Buffer> => {
  const inputBuffer = await downloadImageBuffer(imageUrl);
  return processImage(inputBuffer);
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
    if (media.type === "image") {
      // 1. Download original from Cloudinary & run Sharp processing
      const processedBuffer = await processImageFromUrl(media.url);

      // 2. Upload processed buffer back to Cloudinary
      const result = await uploadBufferToCloudinary(
        processedBuffer,
        "sotrix/processed"
      );

      // 3. Save optimizedUrl & mark status completed
      media.optimizedUrl = result.secure_url;
      media.status = "completed";
      await media.save();
    } else {
      // Non-image media (e.g. video) fallback
      await processCloudinaryMedia(media.publicId, media.type);
      media.status = "completed";
      await media.save();
    }

    return media;
  } catch (error) {
    media.status = "failed";
    await media.save();

    // Re-throw so worker handles retries & terminal failure
    throw error;
  }
};

export const processMedia = processMediaDocument;
