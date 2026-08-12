import { Readable } from "stream";
import cloudinary from "../config/cloudinary";

export const uploadImage = (
    buffer: Buffer
): Promise<{
    secure_url: string;
    public_id: string;
}> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "sotrix/posts",
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

export const deleteFromCloudinary = async (
    publicId: string
): Promise<void> => {
    await cloudinary.uploader.destroy(publicId);
};
