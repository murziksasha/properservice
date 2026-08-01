import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { assertAdminIp } from '@/lib/require-admin-ip';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import {
  deleteUpload,
  folderCounts,
  listFoldersWithCounts,
  listUploads,
} from '@/lib/media';
import { patchMediaMeta, reorderMediaItems } from '@/lib/media-index';
import { isMediaPurpose } from '@/lib/media-purpose';

export const dynamic = 'force-dynamic';

async function guard() {
  const ipGate = await assertAdminIp();
  if (!ipGate.ok) {
    return { ok: false as const, response: NextResponse.json({ error: ipGate.error }, { status: ipGate.status }) };
  }
  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true as const };
}

function parseSort(raw: string | null): 'manual' | 'mtime' | 'name' {
  if (raw === 'manual' || raw === 'name' || raw === 'mtime') return raw;
  return 'mtime';
}

export async function GET(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  const purposeRaw = request.nextUrl.searchParams.get('purpose') || '';
  const purpose =
    purposeRaw && purposeRaw !== 'all' && isMediaPurpose(purposeRaw) ? purposeRaw : undefined;
  const q = request.nextUrl.searchParams.get('q') || undefined;
  const tag = request.nextUrl.searchParams.get('tag') || undefined;
  const folderRaw = request.nextUrl.searchParams.get('folder');
  const folder =
    folderRaw === null || folderRaw === '' || folderRaw === 'all'
      ? 'all'
      : folderRaw === 'root' || folderRaw === '__root'
        ? 'root'
        : folderRaw;
  const sort = parseSort(request.nextUrl.searchParams.get('sort'));

  const [items, folders, counts] = await Promise.all([
    listUploads({ purpose, q, tag, folder, sort }),
    listFoldersWithCounts(),
    folderCounts(),
  ]);

  return NextResponse.json({
    items,
    folders,
    counts: {
      all: counts.all || 0,
      root: counts.root || 0,
    },
    count: items.length,
    bytes: items.reduce((s, i) => s + i.size, 0),
    sort,
    folder,
  });
}

export async function PATCH(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  const rl = rateLimit(clientKey(request, 'media-patch'), { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000) || 60;
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      purpose?: string;
      tags?: string[] | string;
      alt?: string;
      folderId?: string;
      sortOrder?: number;
      /** Bulk reorder within a folder */
      orderedNames?: string[];
      reorderFolderId?: string;
    };

    if (Array.isArray(body.orderedNames)) {
      const names = body.orderedNames.filter((n): n is string => typeof n === 'string');
      const folderId =
        typeof body.reorderFolderId === 'string' ? body.reorderFolderId : body.folderId || '';
      const updated = await reorderMediaItems(folderId === 'root' ? '' : folderId, names);
      return NextResponse.json({ ok: true, items: updated });
    }

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }
    const purpose =
      body.purpose && isMediaPurpose(body.purpose) ? body.purpose : undefined;
    let tags: string[] | undefined;
    if (Array.isArray(body.tags)) {
      tags = body.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean);
    } else if (typeof body.tags === 'string') {
      tags = body.tags
        .split(/[,;]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    }
    let folderId: string | undefined;
    if (body.folderId !== undefined) {
      folderId = body.folderId === 'root' || body.folderId === '__root' ? '' : body.folderId;
    }
    const meta = await patchMediaMeta(body.name, {
      purpose,
      tags,
      alt: typeof body.alt === 'string' ? body.alt : undefined,
      folderId,
      sortOrder:
        typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)
          ? body.sortOrder
          : undefined,
    });
    if (!meta) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: meta });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  const rl = rateLimit(clientKey(request, 'media-delete'), { limit: 40, windowMs: 60_000 });
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000) || 60;
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const body = (await request.json()) as { name?: string };
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }
    const ok = await deleteUpload(body.name);
    if (!ok) {
      return NextResponse.json({ error: 'Not found or invalid name' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
