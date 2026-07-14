import { promises as fs } from 'fs';
import path from 'path';

export interface MediaItem {
  name: string;
  url: string;
  size: number;
  mtime: string;
}

const SAFE_NAME = /^[\w.-]+$/;

export function uploadsDir(): string {
  return path.join(process.cwd(), 'public', 'uploads');
}

export function isSafeUploadName(name: string): boolean {
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  return SAFE_NAME.test(name);
}

export async function listUploads(): Promise<MediaItem[]> {
  const dir = uploadsDir();
  try {
    const names = await fs.readdir(dir);
    const items: MediaItem[] = [];
    for (const name of names) {
      if (name.startsWith('.')) continue;
      if (!isSafeUploadName(name)) continue;
      const full = path.join(dir, name);
      const stat = await fs.stat(full);
      if (!stat.isFile()) continue;
      items.push({
        name,
        url: `/uploads/${name}`,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      });
    }
    items.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
    return items;
  } catch {
    return [];
  }
}

export async function deleteUpload(name: string): Promise<boolean> {
  if (!isSafeUploadName(name)) return false;
  try {
    await fs.unlink(path.join(uploadsDir(), name));
    return true;
  } catch {
    return false;
  }
}

export async function uploadsStats(): Promise<{ count: number; bytes: number }> {
  const items = await listUploads();
  return {
    count: items.length,
    bytes: items.reduce((sum, i) => sum + i.size, 0),
  };
}
