import type { ImagePresetId } from '@/lib/image-presets';
import { parseRetryAfterSeconds, rateLimitMessage } from './rateLimitUi';

export type UploadImageOptions = {
  preset?: ImagePresetId | string;
  maxWidth?: number;
  maxHeight?: number;
};

export type UploadImageResult = {
  url: string;
  error?: string;
  width?: number;
  height?: number;
  optimized?: boolean;
};

export async function uploadImage(
  file: File,
  options?: UploadImageOptions,
): Promise<UploadImageResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.preset) {
    formData.append('preset', String(options.preset));
  }
  if (options?.maxWidth != null && Number.isFinite(options.maxWidth)) {
    formData.append('maxWidth', String(Math.round(options.maxWidth)));
  }
  if (options?.maxHeight != null && Number.isFinite(options.maxHeight)) {
    formData.append('maxHeight', String(Math.round(options.maxHeight)));
  }

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });

    if (res.status === 429) {
      const seconds = parseRetryAfterSeconds(res, 60);
      return { url: '', error: rateLimitMessage(seconds, 'upload') };
    }

    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
      width?: number;
      height?: number;
      optimized?: boolean;
    };

    if (!res.ok) {
      return { url: '', error: json.error || 'Upload failed' };
    }

    return {
      url: json.url || '',
      error: json.url ? undefined : 'No URL returned',
      width: json.width,
      height: json.height,
      optimized: json.optimized,
    };
  } catch {
    return { url: '', error: 'Network error' };
  }
}
