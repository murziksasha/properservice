import sharp from 'sharp';

const MAX_EDGE = 1920;
const WEBP_QUALITY = 82;

export interface OptimizeResult {
  buffer: Buffer;
  ext: '.webp' | '.jpg' | '.png' | '.gif';
  contentType: string;
  optimized: boolean;
}

/**
 * Resize large images and convert photos to WebP (gif left as-is).
 * Falls back to original buffer if sharp fails.
 */
export async function optimizeImageUpload(
  input: Buffer,
  sourceExt: string,
): Promise<OptimizeResult> {
  const ext = sourceExt.toLowerCase();

  // Animated / simple GIF: keep as-is
  if (ext === '.gif') {
    return {
      buffer: input,
      ext: '.gif',
      contentType: 'image/gif',
      optimized: false,
    };
  }

  try {
    let pipeline = sharp(input, { failOn: 'none' }).rotate();
    const meta = await pipeline.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;

    if (w > MAX_EDGE || h > MAX_EDGE) {
      pipeline = pipeline.resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Prefer WebP for photos; keep PNG if source has alpha and small graphics feel
    const hasAlpha = Boolean(meta.hasAlpha);
    if (hasAlpha && ext === '.png' && w > 0 && w <= 800 && h <= 800) {
      const buffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      return { buffer, ext: '.png', contentType: 'image/png', optimized: true };
    }

    const buffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    return { buffer, ext: '.webp', contentType: 'image/webp', optimized: true };
  } catch (err) {
    console.error('[image-optimize] sharp failed, using original', err);
    const fallbackExt =
      ext === '.png' ? '.png' : ext === '.webp' ? '.webp' : ext === '.gif' ? '.gif' : '.jpg';
    const contentType =
      fallbackExt === '.png'
        ? 'image/png'
        : fallbackExt === '.webp'
          ? 'image/webp'
          : fallbackExt === '.gif'
            ? 'image/gif'
            : 'image/jpeg';
    return { buffer: input, ext: fallbackExt, contentType, optimized: false };
  }
}
