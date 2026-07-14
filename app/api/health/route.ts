import { NextResponse } from 'next/server';
import { getHealthReport } from '@/lib/health';

export const dynamic = 'force-dynamic';

/**
 * Health probe for Docker / Keen DNS / admin dashboard.
 * Does not expose secrets.
 */
export async function GET() {
  const report = await getHealthReport();

  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
