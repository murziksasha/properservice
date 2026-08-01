import { promises as fs } from 'fs';
import path from 'path';
import { atomicWriteJson } from './atomic-write';
import {
  isMediaPurpose,
  type MediaPurpose,
} from './media-purpose';
import { projectRoot } from './uploads-path';

export type MediaMeta = {
  name: string;
  url: string;
  purpose: MediaPurpose;
  tags: string[];
  alt?: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
};

export type MediaIndex = {
  version: 1;
  items: MediaMeta[];
};

export type MediaListItem = {
  name: string;
  url: string;
  size: number;
  mtime: string;
  purpose: MediaPurpose;
  tags: string[];
  alt?: string;
  width?: number;
  height?: number;
};

function getIndexPath(): string {
  if (process.env.DATA_DIR && process.env.DATA_DIR.trim()) {
    return path.join(path.resolve(process.env.DATA_DIR.trim()), 'media-index.json');
  }
  return path.join(projectRoot(), 'data', 'media-index.json');
}

function emptyIndex(): MediaIndex {
  return { version: 1, items: [] };
}

function normalizeItem(raw: Partial<MediaMeta> & { name?: string }): MediaMeta | null {
  if (!raw.name || typeof raw.name !== 'string') return null;
  const purpose =
    raw.purpose && isMediaPurpose(raw.purpose) ? raw.purpose : ('other' as MediaPurpose);
  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .filter((t): t is string => typeof t === 'string' && t.trim() !== '')
        .map((t) => t.trim())
    : [];
  const now = new Date().toISOString();
  return {
    name: raw.name,
    url: raw.url && typeof raw.url === 'string' ? raw.url : `/uploads/${raw.name}`,
    purpose,
    tags,
    alt: typeof raw.alt === 'string' ? raw.alt : undefined,
    width: typeof raw.width === 'number' && Number.isFinite(raw.width) ? raw.width : undefined,
    height: typeof raw.height === 'number' && Number.isFinite(raw.height) ? raw.height : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  };
}

export async function readMediaIndex(): Promise<MediaIndex> {
  const filePath = getIndexPath();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<MediaIndex>;
    const items: MediaMeta[] = [];
    if (Array.isArray(parsed.items)) {
      for (const row of parsed.items) {
        const n = normalizeItem(row as Partial<MediaMeta>);
        if (n) items.push(n);
      }
    }
    return { version: 1, items };
  } catch {
    return emptyIndex();
  }
}

export async function writeMediaIndex(index: MediaIndex): Promise<void> {
  const filePath = getIndexPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await atomicWriteJson(filePath, { version: 1 as const, items: index.items });
}

export async function upsertMediaMeta(
  entry: Omit<MediaMeta, 'createdAt' | 'updatedAt' | 'url'> & {
    url?: string;
    createdAt?: string;
    width?: number;
    height?: number;
    alt?: string;
  },
): Promise<MediaMeta> {
  const index = await readMediaIndex();
  const now = new Date().toISOString();
  const existing = index.items.find((i) => i.name === entry.name);
  const next: MediaMeta = {
    name: entry.name,
    url: entry.url || `/uploads/${entry.name}`,
    purpose: entry.purpose,
    tags: entry.tags || [],
    alt: entry.alt,
    width: entry.width,
    height: entry.height,
    createdAt: existing?.createdAt || entry.createdAt || now,
    updatedAt: now,
  };
  if (existing) {
    index.items = index.items.map((i) => (i.name === entry.name ? next : i));
  } else {
    index.items.unshift(next);
  }
  await writeMediaIndex(index);
  return next;
}

export async function patchMediaMeta(
  name: string,
  patch: { purpose?: MediaPurpose; tags?: string[]; alt?: string },
): Promise<MediaMeta | null> {
  const index = await readMediaIndex();
  const existing = index.items.find((i) => i.name === name);
  if (!existing) {
    if (!patch.purpose && patch.tags === undefined && patch.alt === undefined) return null;
    return upsertMediaMeta({
      name,
      purpose: patch.purpose || 'other',
      tags: patch.tags || [],
      alt: patch.alt,
    });
  }
  const next: MediaMeta = {
    ...existing,
    purpose: patch.purpose && isMediaPurpose(patch.purpose) ? patch.purpose : existing.purpose,
    tags: patch.tags !== undefined ? patch.tags : existing.tags,
    alt: patch.alt !== undefined ? patch.alt : existing.alt,
    updatedAt: new Date().toISOString(),
  };
  index.items = index.items.map((i) => (i.name === name ? next : i));
  await writeMediaIndex(index);
  return next;
}

export async function removeMediaMeta(name: string): Promise<void> {
  const index = await readMediaIndex();
  const next = index.items.filter((i) => i.name !== name);
  if (next.length === index.items.length) return;
  await writeMediaIndex({ version: 1, items: next });
}
