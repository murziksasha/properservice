import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { toCsv } from '@/lib/csv';
import { assertAdminIp } from '@/lib/require-admin-ip';
import { deleteLead, listLeads, updateLead } from '@/lib/leads';

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

export async function GET(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  const leads = await listLeads();
  const format = request.nextUrl.searchParams.get('format');
  if (format === 'csv') {
    const csv = toCsv(
      [
        'id',
        'createdAt',
        'phone',
        'pagePath',
        'utmSource',
        'utmMedium',
        'utmCampaign',
        'handled',
        'note',
        'emailed',
      ],
      leads.map((l) => [
        l.id,
        l.createdAt,
        l.phone,
        l.pagePath || '',
        l.utmSource || '',
        l.utmMedium || '',
        l.utmCampaign || '',
        l.handled,
        l.note || '',
        l.emailed,
      ]),
    );
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="leads.csv"',
      },
    });
  }
  return NextResponse.json({
    leads,
    total: leads.length,
    unhandled: leads.filter((l) => !l.handled).length,
  });
}

export async function PATCH(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  try {
    const body = (await request.json()) as { id?: string; handled?: boolean; note?: string };
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const updated = await updateLead(body.id, {
      handled: body.handled,
      note: body.note,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, lead: updated });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const ok = await deleteLead(body.id);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
