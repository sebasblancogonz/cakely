import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.mjs';

export async function middleware(req: Request) {
  const session = await auth();

  if (!session && !req.url.includes('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|api/auth).*)']
};
