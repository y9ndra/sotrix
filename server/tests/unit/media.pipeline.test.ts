import mongoose from "mongoose";
import sharp from "sharp";
import Media from "../../src/models/media.model";
import { uploadAndCreateMedia } from "../../src/services/media.service";
import { processMediaDocument } from "../../src/services/media-processing.service";
import * as cloudinaryService from "../../src/services/cloudinary.service";
import * as mediaQueueModule from "../../src/queues/media.queue";

// Mock cloudinary service
jest.mock("../../src/services/cloudinary.service", () => ({
  uploadImage: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    public_id: "sotrix/media/sample_123",
  }),
  uploadBufferToCloudinary: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/image/upload/sotrix/processed/sample_proc.webp",
    public_id: "sotrix/processed/sample_proc",
  }),
  deleteFromCloudinary: jest.fn().mockResolvedValue(undefined),
  processMedia: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/image/upload/sample_opt.webp",
  }),
}));

describe("Media Pipeline - End-to-End Unit Tests", () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockBuffer = Buffer.from("fake-image-content");
  const originalFetch = global.fetch;

  beforeAll(async () => {
    // Generate valid sample image buffer for fetch mocking
    const sampleImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () =>
        sampleImageBuffer.buffer.slice(
          sampleImageBuffer.byteOffset,
          sampleImageBuffer.byteOffset + sampleImageBuffer.byteLength
        ),
    } as any);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Upload and Producer Queueing", () => {
    it("should upload file to Cloudinary, save Media with status 'processing', and enqueue job", async () => {
      const addJobSpy = jest.spyOn(mediaQueueModule, "addMediaProcessingJob");

      const media = await uploadAndCreateMedia({
        userId: mockUserId,
        buffer: mockBuffer,
      });

      expect(media).toBeDefined();
      expect(media.status).toBe("processing");
      expect(media.url).toBe("https://res.cloudinary.com/demo/image/upload/sample.jpg");
      expect(media.publicId).toBe("sotrix/media/sample_123");

      // Verify DB persistence
      const saved = await Media.findById(media._id);
      expect(saved).not.toBeNull();
      expect(saved?.status).toBe("processing");

      // Verify job was queued
      expect(addJobSpy).toHaveBeenCalledWith(media._id.toString());
    });
  });

  describe("2. Worker Processing and Status Transitions", () => {
    it("should process image via Sharp, upload to Cloudinary, and save optimizedUrl", async () => {
      const media = await Media.create({
        user: mockUserId,
        url: "https://res.cloudinary.com/demo/image/upload/initial.jpg",
        publicId: "sotrix/media/test_proc",
        type: "image",
        status: "processing",
      });

      const processed = await processMediaDocument(media._id.toString());

      expect(processed.status).toBe("completed");
      expect(processed.optimizedUrl).toBe(
        "https://res.cloudinary.com/demo/image/upload/sotrix/processed/sample_proc.webp"
      );
      expect(cloudinaryService.uploadBufferToCloudinary).toHaveBeenCalledWith(
        expect.any(Buffer),
        "sotrix/processed"
      );

      // Verify status & optimizedUrl in DB
      const updated = await Media.findById(media._id);
      expect(updated?.status).toBe("completed");
      expect(updated?.optimizedUrl).toBe(
        "https://res.cloudinary.com/demo/image/upload/sotrix/processed/sample_proc.webp"
      );
    });
  });

  describe("3. Idempotency Guard", () => {
    it("should skip processing if media is already 'completed'", async () => {
      const media = await Media.create({
        user: mockUserId,
        url: "https://res.cloudinary.com/demo/image/upload/done.jpg",
        publicId: "sotrix/media/already_done",
        type: "image",
        status: "completed",
        optimizedUrl: "https://res.cloudinary.com/demo/image/upload/sotrix/processed/already_done.webp",
      });

      const result = await processMediaDocument(media._id.toString());

      expect(result.status).toBe("completed");
      // Uploading to Cloudinary must NOT be called again
      expect(cloudinaryService.uploadBufferToCloudinary).not.toHaveBeenCalled();
    });
  });

  describe("4. Error Propagation for Retries", () => {
    it("should throw error when processing fails so BullMQ can trigger backoff retry", async () => {
      (cloudinaryService.uploadBufferToCloudinary as jest.Mock).mockRejectedValueOnce(
        new Error("Cloudinary upload timeout")
      );

      const media = await Media.create({
        user: mockUserId,
        url: "https://res.cloudinary.com/demo/image/upload/fail.jpg",
        publicId: "sotrix/media/fail_test",
        type: "image",
        status: "processing",
      });

      await expect(processMediaDocument(media._id.toString())).rejects.toThrow(
        "Cloudinary upload timeout"
      );
    });
  });
});
