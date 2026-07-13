import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createId } from '@/lib/id';

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
        // WEBP signature at offset 8
        if (buffer.toString('ascii', 8, 12) !== 'WEBP') continue;
      }
      return m.ext === '.jpg' ? '.jpg' : m.ext;
    }
  }
  // Fallback: trust declared extension only if whitelisted and type matched
  if (ALLOWED_EXT.has(declaredExt)) return declaredExt;
  return null;
}

export async function POST(request: NextRequest) {
  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const rawExt = path.extname(file.name).toLowerCase();
    const declaredExt = rawExt === '.jpeg' ? '.jpg' : rawExt;

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeExt = detectExt(buffer, declaredExt);

    if (!safeExt || !ALLOWED_EXT.has(safeExt)) {
      return NextResponse.json({ error: 'Invalid image content' }, { status: 400 });
    }

    const safeName = `${Date.now()}-${createId()}${safeExt}`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, safeName), buffer);

    return NextResponse.json({ url: `/uploads/${safeName}` });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
