import { NextRequest, NextResponse } from 'next/server';

const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/api/auth',
  '/accept-invitation',
  '/auth/denied',
  '/auth/invitation-required'
];

const sessionCookieName =
  process.env.NODE_ENV === 'production'
    ? (process.env.AUTH_COOKIE_NAME ?? '__Secure-authjs.session-token')
    : 'authjs.session-token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = publicPaths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(path + '/') ||
      (path === '/api/auth' && pathname.startsWith('/api/auth'))
  );

  if (!isPublic) {
    const sessionCookie = request.cookies.get(sessionCookieName);

    if (!sessionCookie) {
      console.log(
        `Middleware: No session cookie (${sessionCookieName}), redirecting from protected path ${pathname} to login`
      );
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    } else {
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|logo.webp|img/).*)']
};
