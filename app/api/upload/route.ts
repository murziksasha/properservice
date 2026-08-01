import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createId } from '@/lib/id';
import { optimizeImageUpload } from '@/lib/image-optimize';
import { isImagePresetId } from '@/lib/image-presets';
import { upsertMediaMeta } from '@/lib/media-index';
import { isMediaPurpose, purposeFromPreset } from '@/lib/media-purpose';
import { assertAdminIp } from '@/lib/require-admin-ip';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { atomicWriteFile } from '@/lib/atomic-write';
import { uploadsDir } from '@/lib/uploads-path';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_SIZE = 5 * 1024 * 1024;

const MAGIC: Array<{ ext: string; bytes: number[] }> = [
  { ext: '.jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: '.png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: '.gif', bytes: [0x47, 0x49, 0x46] },
  { ext: '.webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP
];

function detectExt(buffer: Buffer, declaredExt: string): string | null {
  for (const m of MAGIC) {
    if (m.bytes.every((b, i) => buffer[i] === b)) {
      if (m.ext === '.webp') {
        if (buffer.toString('ascii', 8, 12) !== 'WEBP') continue;
      }
      return m.ext === '.jpg' ? '.jpg' : m.ext;
    }
  }
  if (ALLOWED_EXT.has(declaredExt)) return declaredExt;
  return null;
}

export async function POST(request: NextRequest) {
  const ipGate = await assertAdminIp();
  if (!ipGate.ok) {
    return NextResponse.json({ error: ipGate.error }, { status: ipGate.status });
  }

  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(clientKey(request, 'upload'), { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000) || 60;
    return NextResponse.json(
      { error: 'Too many uploads', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const presetRaw = String(formData.get('preset') || '').trim();
    const preset = isImagePresetId(presetRaw) ? presetRaw : undefined;
    const purposeRaw = String(formData.get('purpose') || '').trim();
    const purpose = isMediaPurpose(purposeRaw) ? purposeRaw : purposeFromPreset(preset);
    const tagsRaw = String(formData.get('tags') || '').trim();
    const tags = tagsRaw
      ? tagsRaw
          .split(/[,;]+/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    const maxWidthRaw = formData.get('maxWidth');
    const maxHeightRaw = formData.get('maxHeight');
    const maxWidth =
      maxWidthRaw != null && String(maxWidthRaw).trim() !== ''
        ? Number(maxWidthRaw)
        : undefined;
    const maxHeight =
      maxHeightRaw != null && String(maxHeightRaw).trim() !== ''
        ? Number(maxHeightRaw)
        : undefined;

    const rawExt = path.extname(file.name).toLowerCase();
    const declaredExt = rawExt === '.jpeg' ? '.jpg' : rawExt;

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeExt = detectExt(buffer, declaredExt);

    if (!safeExt || !ALLOWED_EXT.has(safeExt)) {
      return NextResponse.json({ error: 'Invalid image content' }, { status: 400 });
    }

    const optimized = await optimizeImageUpload(buffer, safeExt, {
      preset,
      maxWidth: Number.isFinite(maxWidth) ? maxWidth : undefined,
      maxHeight: Number.isFinite(maxHeight) ? maxHeight : undefined,
    });
    const safeName = `${Date.now()}-${createId()}${optimized.ext}`;
    const dir = uploadsDir();

    await fs.mkdir(dir, { recursive: true });
    await atomicWriteFile(path.join(dir, safeName), optimized.buffer);

    const url = `/uploads/${safeName}`;
    await upsertMediaMeta({
      name: safeName,
      url,
      purpose,
      tags,
      width: optimized.width,
      height: optimized.height,
    });

    return NextResponse.json({
      url,
      optimized: optimized.optimized,
      contentType: optimized.contentType,
      width: optimized.width,
      height: optimized.height,
      preset: preset || 'default',
      purpose,
      tags,
    });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
