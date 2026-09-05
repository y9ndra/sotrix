import sharp from "sharp";
import {
  processImage,
  downloadImageBuffer,
  processImageFromUrl,
} from "../../src/services/media-processing.service";

describe("Media Processing Service - processImage", () => {
  it("should resize large image down to max width 1200 and convert to webp", async () => {
    // Generate a 1600x1200 sample image
    const inputBuffer = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const outputBuffer = await processImage(inputBuffer);

    expect(outputBuffer).toBeInstanceOf(Buffer);
    expect(outputBuffer.length).toBeGreaterThan(0);

    const metadata = await sharp(outputBuffer).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1200);
  });

  it("should keep smaller image dimensions without enlargement", async () => {
    // Generate an 800x600 sample image
    const inputBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const outputBuffer = await processImage(inputBuffer);

    const metadata = await sharp(outputBuffer).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(600);
  });
});

describe("Media Processing Service - Cloudinary Download & Processing", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should download image buffer from a URL and process it with Sharp into WebP", async () => {
    const rawBuffer = await sharp({
      create: {
        width: 1500,
        height: 1000,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () =>
        rawBuffer.buffer.slice(rawBuffer.byteOffset, rawBuffer.byteOffset + rawBuffer.byteLength),
    } as any);

    const processed = await processImageFromUrl(
      "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    );
    expect(processed).toBeInstanceOf(Buffer);

    const meta = await sharp(processed).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1200);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    );
  });

  it("should throw error if fetch response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as any);

    await expect(
      downloadImageBuffer("https://res.cloudinary.com/demo/image/upload/nonexistent.jpg")
    ).rejects.toThrow("Failed to download image");
  });
});
