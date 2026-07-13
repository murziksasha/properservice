import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * Middleware only does a cheap cookie-presence check.
 * Full HMAC validation runs in Node (admin layout) where runtime env secrets work.
 * Edge Middleware does not reliably receive Docker runtime env vars for signing secrets.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
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

  // Pass pathname so the admin layout can skip/allow correctly if needed
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-admin-pathname', pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/admin/:path*'],
};
