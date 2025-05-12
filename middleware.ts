import { NextRequest, NextResponse } from 'next/server';
import { auth } from './lib/auth';

const publicPaths = [
  '/login',
  '/api/auth',
  '/accept-invitation',
  '/auth/denied',
  '/auth/invitation-required'
];

const sessionCookieName =
  process.env.NODE_ENV === 'production'
    ? (process.env.AUTH_COOKIE_NAME ?? '__Secure-authjs.session-token')
    : 'authjs.session-token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth();
  const user = session?.user;

  if (pathname.startsWith('/admin')) {
    if (!user?.isSuperAdmin) {
      console.warn(
        `[Middleware] Acceso NO AUTORIZADO a /admin por: ${user?.email ?? 'Guest'}`
      );
      const targetUrl = user ? '/' : '/login';
      const redirectUrl = new URL(targetUrl, request.url);
      if (targetUrl === '/login' && pathname !== '/login') {
        redirectUrl.searchParams.set('callbackUrl', pathname);
      }
      return NextResponse.redirect(redirectUrl);
    }
    console.log(`[Middleware] Acceso AUTORIZADO a /admin para: ${user.email}`);
    return NextResponse.next();
  }

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
