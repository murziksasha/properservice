import { promises as fs } from 'fs';
import path from 'path';
import { readMediaIndex, removeMediaMeta, type MediaListItem } from './media-index';
import type { MediaPurpose } from './media-purpose';
import { uploadsDir as resolveUploadsDir } from './uploads-path';

export type { MediaListItem };

/** @deprecated use MediaListItem — kept alias for callers */
export type MediaItem = MediaListItem;

const SAFE_NAME = /^[\w.-]+$/;

export function uploadsDir(): string {
  return resolveUploadsDir();
}

export function isSafeUploadName(name: string): boolean {
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  return SAFE_NAME.test(name);
}

export type ListUploadsOptions = {
  purpose?: MediaPurpose | 'all';
  q?: string;
  tag?: string;
};

export async function listUploads(options?: ListUploadsOptions): Promise<MediaListItem[]> {
  const dir = uploadsDir();
  const index = await readMediaIndex();
  const byName = new Map(index.items.map((i) => [i.name, i]));

  let diskNames: string[] = [];
  try {
    diskNames = await fs.readdir(dir);
  } catch {
    diskNames = [];
  }

  const items: MediaListItem[] = [];
  for (const name of diskNames) {
    if (name.startsWith('.')) continue;
    if (!isSafeUploadName(name)) continue;
    const full = path.join(dir, name);
    let stat;
    try {
      stat = await fs.stat(full);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    const meta = byName.get(name);
    items.push({
      name,
      url: `/uploads/${name}`,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      purpose: meta?.purpose || 'other',
      tags: meta?.tags || [],
      alt: meta?.alt,
      width: meta?.width,
      height: meta?.height,
    });
  }

  items.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));

  const purpose = options?.purpose && options.purpose !== 'all' ? options.purpose : null;
  const q = options?.q?.trim().toLowerCase() || '';
  const tag = options?.tag?.trim().toLowerCase() || '';

  return items.filter((item) => {
    if (purpose && item.purpose !== purpose) return false;
    if (tag && !item.tags.some((t) => t.toLowerCase() === tag || t.toLowerCase().includes(tag))) {
      return false;
    }
    if (q) {
      const hay = `${item.name} ${item.tags.join(' ')} ${item.alt || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function deleteUpload(name: string): Promise<boolean> {
  if (!isSafeUploadName(name)) return false;
  try {
    await fs.unlink(path.join(uploadsDir(), name));
    await removeMediaMeta(name);
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
