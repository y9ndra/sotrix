import request from "supertest";
import sharp from "sharp";
import app from "../../src/app";
import Media from "../../src/models/media.model";
import { processMedia } from "../../src/services/media-processing.service";
import * as cloudinaryService from "../../src/services/cloudinary.service";

// Mock Cloudinary service
jest.mock("../../src/services/cloudinary.service", () => ({
  uploadImage: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/image/upload/original_sample.jpg",
    public_id: "sotrix/media/original_sample",
  }),
  uploadBufferToCloudinary: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/image/upload/sotrix/processed/optimized_sample.webp",
    public_id: "sotrix/processed/optimized_sample",
  }),
  deleteFromCloudinary: jest.fn().mockResolvedValue(undefined),
  processMedia: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/image/upload/sample_opt.webp",
  }),
}));

describe("Day 36 Complete Flow - Upload -> Queue -> Worker -> Sharp -> Cloudinary -> MongoDB", () => {
  let authToken: string;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    // Generate valid sample image buffer for fetch mocking
    const sampleImageBuffer = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 120, g: 50, b: 200 },
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

    // Create test user
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send({
        username: "mediauser",
        email: "mediauser@test.com",
        password: "Password123!",
      });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: "mediauser@test.com",
        password: "Password123!",
      });

    authToken = loginRes.body.token || signupRes.body.token;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("1. Complete Happy Path: Upload -> Processing -> Sharp -> Cloudinary -> Completed", async () => {
    // Create an image buffer to upload
    const dummyImage = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 255, g: 100, b: 50 },
      },
    })
      .jpeg()
      .toBuffer();

    // 1. Upload succeeds -> Media document created with status 'processing'
    const uploadRes = await request(app)
      .post("/api/upload/media")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("image", dummyImage, "test-photo.jpg");

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    const mediaId = uploadRes.body.data._id;
    expect(mediaId).toBeDefined();
    expect(uploadRes.body.data.status).toBe("processing");
    expect(uploadRes.body.data.url).toBe("https://res.cloudinary.com/demo/image/upload/original_sample.jpg");

    // Verify initial status via status endpoint
    const initialStatusRes = await request(app)
      .get(`/api/upload/media/${mediaId}/status`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(initialStatusRes.status).toBe(200);
    expect(initialStatusRes.body.data.status).toBe("processing");

    // 2. Worker executes job -> processMedia runs Sharp & uploads to Cloudinary
    const processedDoc = await processMedia(mediaId);

    expect(processedDoc.status).toBe("completed");
    expect(processedDoc.optimizedUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/sotrix/processed/optimized_sample.webp"
    );
    expect(cloudinaryService.uploadBufferToCloudinary).toHaveBeenCalledWith(
      expect.any(Buffer),
      "sotrix/processed"
    );

    // 3. Status endpoint now returns status 'completed' and optimizedUrl
    const completedStatusRes = await request(app)
      .get(`/api/upload/media/${mediaId}/status`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(completedStatusRes.status).toBe(200);
    expect(completedStatusRes.body.data.status).toBe("completed");
    expect(completedStatusRes.body.data.optimizedUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/sotrix/processed/optimized_sample.webp"
    );
  });

  it("2. Failure Path: Worker fails processing -> status 'failed' -> throws for BullMQ retry", async () => {
    // Create media document
    const media = await Media.create({
      user: "66f000000000000000000001",
      url: "https://res.cloudinary.com/demo/image/upload/broken.jpg",
      publicId: "sotrix/media/broken",
      type: "image",
      status: "processing",
    });

    // Simulate Cloudinary failure on upload
    (cloudinaryService.uploadBufferToCloudinary as jest.Mock).mockRejectedValueOnce(
      new Error("Cloudinary connection reset")
    );

    // Worker triggers processing
    await expect(processMedia(media._id.toString())).rejects.toThrow(
      "Cloudinary connection reset"
    );

    // Verify MongoDB status transitioned to 'failed'
    const updatedMedia = await Media.findById(media._id);
    expect(updatedMedia?.status).toBe("failed");
  });
});
