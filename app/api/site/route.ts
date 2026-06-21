import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSiteData, saveSiteData } from '@/lib/site-data';
import type { SiteData } from '@/lib/types';

export async function GET() {
  const data = await getSiteData();
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SiteData;

    if (!body.settings || !Array.isArray(body.pages) || !Array.isArray(body.goods)) {
      return NextResponse.json({ error: 'Invalid site data' }, { status: 400 });
    }

    await saveSiteData(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}