import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSiteData, saveSiteData } from '@/lib/site-data';
import { parseSiteData } from '@/lib/validation';

export async function GET() {
  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getSiteData();
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = parseSiteData(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await saveSiteData(parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
