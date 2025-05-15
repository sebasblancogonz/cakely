import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const publicPaths = [
  '/login',
  '/signup',
  '/privacidad',
  '/terminos',
  '/contacto',
  '/auth/denied',
  '/auth/invitation-required'
];

const authenticatedAppPathsWithoutBusinessId = [
  '/admin',
  '/admin/negocios',
  '/admin/usuarios',
  '/perfil'
];

const superAdminRootPath = '/admin';
const appUserRootPath = '/pedidos';

const nextAuthSecret = process.env.AUTH_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname, search, origin } = request.nextUrl;
  const fullPathWithQuery = pathname + search;

  if (!nextAuthSecret) {
    console.error('[Middleware] FATAL: NEXTAUTH_SECRET no está definido.');

    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: nextAuthSecret });

  console.log(
    `[Middleware] Path: ${pathname}, Token valid?: ${!!token}, Email: ${token?.email ?? 'Guest'}, SuperAdmin: ${!!token?.isSuperAdmin}, BusinessID: ${token?.businessId}`
  );

  if (token?.isSuperAdmin) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.next();
    }
  }

  if (pathname.startsWith('/admin') && token && !token.isSuperAdmin) {
    console.warn(
      `[Middleware] Usuario ${token.email} (NO SuperAdmin) intentando acceder a /admin. Redirigiendo.`
    );
    return NextResponse.redirect(
      new URL(token.businessId ? appUserRootPath : '/negocio/crear', origin)
    );
  }

  const isPathPublic = publicPaths.some(
    (publicPath) =>
      pathname === publicPath ||
      (publicPath !== '/' && pathname.startsWith(publicPath + '/'))
  );

  if (isPathPublic) {
    if (token && (pathname === '/login' || pathname === '/signup')) {
      const userDashboard = token.isSuperAdmin
        ? superAdminRootPath
        : token.businessId
          ? appUserRootPath
          : '/negocio/crear';
      console.log(
        `[Middleware] Usuario con token ${token.email} en ${pathname}, redirigiendo a ${userDashboard}`
      );
      return NextResponse.redirect(new URL(userDashboard, origin));
    }
    return NextResponse.next();
  }

  if (!token) {
    console.log(
      `[Middleware] No hay token para ruta protegida ${pathname}, redirigiendo a /login`
    );
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('callbackUrl', fullPathWithQuery);
    return NextResponse.redirect(loginUrl);
  }

  if (!token.isSuperAdmin) {
    const isPathAllowedWithoutBusinessId =
      authenticatedAppPathsWithoutBusinessId.some((allowedPath) =>
        pathname.startsWith(allowedPath)
      );
    if (!token.businessId && !isPathAllowedWithoutBusinessId) {
      console.log(
        `[Middleware] Usuario ${token.email} SIN businessId intentando acceder a ${pathname}. Redirigiendo a /negocio/crear`
      );
      const createBusinessUrl = new URL('/negocio/crear', origin);
      createBusinessUrl.searchParams.set('redirectTo', fullPathWithQuery);
      return NextResponse.redirect(createBusinessUrl);
    }

    if (pathname === '/' && token.businessId) {
      console.log(
        `[Middleware] Usuario ${token.email} con businessId en '/', redirigiendo a ${appUserRootPath}`
      );
      return NextResponse.redirect(new URL(appUserRootPath, origin));
    }
  }

  console.log(
    `[Middleware] Acceso permitido para ${token.email ?? 'usuario con token'} a ${pathname}`
  );
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth/|api/stripe/webhook|_next/static|_next/image|favicon.ico|logo.webp|img/).*)'
  ]
};
