import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { optimizeImageUpload } from './image-optimize';

describe('optimizeImageUpload', () => {
  it('keeps PNG as PNG (does not force WebP)', async () => {
    const png = await sharp({
      create: {
        width: 64,
        height: 32,
        channels: 4,
        background: { r: 2, g: 166, b: 83, alpha: 0.8 },
      },
    })
      .png()
      .toBuffer();

    const result = await optimizeImageUpload(png, '.png');
    expect(result.ext).toBe('.png');
    expect(result.contentType).toBe('image/png');
  });

  it('converts JPEG to WebP', async () => {
    const jpg = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 3,
        background: { r: 200, g: 100, b: 50 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await optimizeImageUpload(jpg, '.jpg');
    expect(result.ext).toBe('.webp');
    expect(result.contentType).toBe('image/webp');
    expect(result.optimized).toBe(true);
  });

  it('leaves GIF unchanged', async () => {
    // Minimal GIF89a 1x1
    const gif = Buffer.from(
      '47494638396101000100800000ffffff00000021f90401000000002c000000000100010000020144003b',
      'hex',
    );
    const result = await optimizeImageUpload(gif, '.gif');
    expect(result.ext).toBe('.gif');
    expect(result.optimized).toBe(false);
    expect(result.buffer.equals(gif)).toBe(true);
  });
});
