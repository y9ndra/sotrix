import { Router, Request, Response, NextFunction } from "express";
import upload from "../middleware/upload.middleware";
import { authenticate } from "../middleware/authenticate";
import { uploadAndCreateMedia, getMediaStatus } from "../services/media.service";

const router = Router();

router.post(
  ["/upload", "/media", "/media/upload"],
  authenticate,
  upload.single("image"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const media = await uploadAndCreateMedia({
        userId: req.user!.id,
        buffer: req.file.buffer,
        type: "image",
      });

      return res.status(201).json({
        success: true,
        message: "Media uploaded and queued for processing",
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/media/:id/status",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const media = await getMediaStatus(req.params.id);
      if (!media) {
        return res.status(404).json({ message: "Media not found" });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: media._id,
          status: media.status,
          url: media.url,
          type: media.type,
          createdAt: media.createdAt,
          updatedAt: media.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
