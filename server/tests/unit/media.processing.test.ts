import sharp from "sharp";
import { processImage } from "../../src/services/media-processing.service";

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
