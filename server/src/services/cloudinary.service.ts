import { Readable } from "stream";
import cloudinary from "../config/cloudinary";

export const uploadImage = (
    buffer: Buffer,
    folder: string = "sotrix/posts"
): Promise<{
    secure_url: string;
    public_id: string;
}> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (!result) {
                    reject(new Error("Cloudinary upload failed"));
                    return;
                }

                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                });
            }
        );

        Readable.from(buffer).pipe(uploadStream);
    });
};

export const uploadBufferToCloudinary = uploadImage;

export const deleteFromCloudinary = async (
    publicId: string
): Promise<void> => {
    await cloudinary.uploader.destroy(publicId);
};

export const processMedia = async (
    publicId: string,
    resourceType: "image" | "video" = "image"
): Promise<{ secure_url?: string }> => {
    // Trigger eager transformations/optimization (compression, resize, webp conversion)
    const result = await cloudinary.uploader.explicit(publicId, {
        type: "upload",
        resource_type: resourceType,
        eager: [
            { width: 800, crop: "limit", quality: "auto", fetch_format: "auto" },
            { width: 300, height: 300, crop: "fill", quality: "auto", fetch_format: "auto" },
        ],
    });
    return {
        secure_url: result.secure_url,
    };
};
