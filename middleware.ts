import { NextRequest, NextResponse } from 'next/server';
import { clientIpFromHeaders, getAdminIpAllowlist, isIpAllowed } from '@/lib/admin-ip';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * Middleware only does a cheap cookie-presence check + optional IP allowlist.
 * Full HMAC validation runs in Node (admin layout) where runtime env secrets work.
 * Edge Middleware does not reliably receive Docker runtime env vars for signing secrets.
 *
 * ADMIN_IP_ALLOWLIST (comma-separated): when set, only those client IPs may hit
 * /admin, /api/auth, /api/site, /api/upload, /api/backup, /api/leads, /api/media, /api/smtp-test.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminUi = pathname.startsWith('/admin');
  const isProtectedApi =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/site') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/backup') ||
    pathname.startsWith('/api/leads') ||
    pathname.startsWith('/api/media') ||
    pathname.startsWith('/api/smtp-test');

  if (!isAdminUi && !isProtectedApi) {
    return NextResponse.next();
  }

  const allowlist = getAdminIpAllowlist();
  // Cron may call /api/backup with Bearer BACKUP_CRON_SECRET from any host — verify in route
  const backupCronHint =
    pathname.startsWith('/api/backup') &&
    (request.headers.get('authorization')?.startsWith('Bearer ') ||
      Boolean(request.headers.get('x-backup-secret')));

  if (allowlist.length > 0 && !backupCronHint) {
    const ip = clientIpFromHeaders(request.headers);
    if (!isIpAllowed(ip, allowlist)) {
      if (isProtectedApi) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return new NextResponse('Admin access denied from this IP', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  }

  if (!isAdminUi) {
    return NextResponse.next();
  }

  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-admin-pathname', pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/auth',
    '/api/auth/:path*',
    '/api/site',
    '/api/site/:path*',
    '/api/upload',
    '/api/upload/:path*',
    '/api/backup',
    '/api/backup/:path*',
    '/api/leads',
    '/api/leads/:path*',
    '/api/media',
    '/api/media/:path*',
    '/api/smtp-test',
    '/api/smtp-test/:path*',
  ],
};
