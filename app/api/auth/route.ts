import { NextRequest, NextResponse } from 'next/server';
import { createSession, destroySession, verifyPassword } from '@/lib/auth';
import { assertAdminIp } from '@/lib/require-admin-ip';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { getTotpSecret, verifyTotp } from '@/lib/totp';

export async function POST(request: NextRequest) {
  const ipGate = await assertAdminIp();
  if (!ipGate.ok) {
    return NextResponse.json({ error: ipGate.error }, { status: ipGate.status });
  }

  const rl = rateLimit(clientKey(request, 'auth'), { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000) || 60;
    return NextResponse.json(
      { error: 'Too many attempts', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password : '';
    const totp = typeof body.totp === 'string' ? body.totp : '';

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'ADMIN_PASSWORD is not set in .env' },
        { status: 503 },
      );
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const totpActive = await getTotpSecret();
    if (totpActive) {
      if (!verifyTotp(totpActive.secret, totp)) {
        return NextResponse.json({ error: 'Invalid 2FA code', needTotp: true }, { status: 401 });
      }
    }

    await createSession();
    return NextResponse.json({ ok: true, totp: Boolean(totpActive) });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
