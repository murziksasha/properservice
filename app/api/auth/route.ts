import { NextRequest, NextResponse } from 'next/server';
import { createSession, destroySession, verifyPassword } from '@/lib/auth';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rl = rateLimit(clientKey(request, 'auth'), { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000) || 60) } },
    );
  }

  try {
    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'ADMIN_PASSWORD is not set in .env' },
        { status: 503 },
      );
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    await createSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
