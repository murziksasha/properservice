import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { assertAdminIp } from '@/lib/require-admin-ip';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { getSiteData, saveSiteData } from '@/lib/site-data';
import { parseSiteData } from '@/lib/validation';

export async function GET() {
  const ipGate = await assertAdminIp();
  if (!ipGate.ok) {
    return NextResponse.json({ error: ipGate.error }, { status: ipGate.status });
  }

  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getSiteData();
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const ipGate = await assertAdminIp();
  if (!ipGate.ok) {
    return NextResponse.json({ error: ipGate.error }, { status: ipGate.status });
  }

  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(clientKey(request, 'site-write'), { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000) || 60;
    return NextResponse.json(
      { error: 'Too many save requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = parseSiteData(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const current = await getSiteData();
    const clientRev = parsed.data.updatedAt;
    const serverRev = current.updatedAt;
    // Optimistic concurrency: if both have a revision and they differ, reject
    if (clientRev && serverRev && clientRev !== serverRev) {
      return NextResponse.json(
        {
          error: 'Дані змінені іншим сеансом. Оновіть сторінку та повторіть.',
          code: 'CONFLICT',
          updatedAt: serverRev,
        },
        { status: 409 },
      );
    }

    const saved = await saveSiteData(parsed.data);
    return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
