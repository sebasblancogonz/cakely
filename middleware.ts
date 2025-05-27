import { NextRequest, NextResponse } from 'next/server';
import { auth } from './lib/auth';

const publicPaths = [
  '/login',
  '/signup',
  '/privacidad',
  '/terminos',
  '/contacto',
  '/auth/denied',
  '/auth/invitation-required'
];

const authenticatedPathsWithoutBusinessOrSubscription = [
  '/negocio/crear',
  '/perfil',
  '/ajustes/suscripcion',
  '/pago/exito',
  '/pago/cancelado'
];

const pathsUnnaccessibleForBasicPlanUsers = [
  '/presupuesto',
  '/estadisticas',
  '/ajustes?tab=team'
];
const superAdminRootPath = '/admin';
const appUserRootPath = '/';

const defaultAppPathForUsersWithoutBusiness = '/negocio/crear';

export async function middleware(request: NextRequest) {
  const { pathname, search, origin } = request.nextUrl;
  const fullPathWithQuery = pathname + search;

  const session = await auth();
  const user = session?.user;

  console.log(
    `[Middleware] Path: ${pathname}, User: ${user?.email ?? 'Guest'}, SuperAdmin: ${!!user?.isSuperAdmin}, BusinessID: ${user?.businessId}, SubStatus: ${user?.subscriptionStatus}`
  );

  if (user?.isSuperAdmin) {
    if (pathname.startsWith(superAdminRootPath)) return NextResponse.next();
    if (!pathname.startsWith('/api/auth')) {
      return NextResponse.redirect(new URL(superAdminRootPath, origin));
    }
  }

  if (pathname.startsWith(superAdminRootPath) && !user?.isSuperAdmin) {
    const fallbackUrl = user
      ? user.businessId
        ? appUserRootPath
        : defaultAppPathForUsersWithoutBusiness
      : '/login';
    const url = new URL(fallbackUrl, origin);
    if (fallbackUrl === '/login') url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  const isPathPublic = publicPaths.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/'))
  );
  if (isPathPublic) {
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const userDashboard = user.isSuperAdmin
        ? superAdminRootPath
        : user.businessId
          ? appUserRootPath
          : defaultAppPathForUsersWithoutBusiness;
      return NextResponse.redirect(new URL(userDashboard, origin));
    }
    return NextResponse.next();
  }

  if (!user) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('callbackUrl', fullPathWithQuery);
    return NextResponse.redirect(loginUrl);
  }

  if (!user.isSuperAdmin) {
    const isPathAllowedWithoutSubscriptionLogic =
      authenticatedPathsWithoutBusinessOrSubscription.some((allowedPath) =>
        pathname.startsWith(allowedPath)
      );

    if (!user.businessId && !isPathAllowedWithoutSubscriptionLogic) {
      console.log(
        `[Middleware] User ${user.email} SIN businessId en ${pathname}. Redirigiendo a /negocio/crear.`
      );
      const createBusinessUrl = new URL('/negocio/crear', origin);
      createBusinessUrl.searchParams.set('redirectTo', fullPathWithQuery);
      return NextResponse.redirect(createBusinessUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|logo.webp|img/).*)']
};
