import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { businesses } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  ApiHandlerOptions,
  AuthenticatedRequestContext,
  ProtectedApiHandler
} from './authTypes';
import { checkPermission } from '@/lib/auth/utils';

const DEFAULT_HANDLER_OPTIONS: Required<ApiHandlerOptions> = {
  requiredRole: [],
  requiresBusiness: true,
  requiresActiveSubscription: true,
  allowSuperAdminBypass: true
};

export function withApiProtection<Params = Record<string, string | string[]>>(
  handler: ProtectedApiHandler<Params>,
  options?: ApiHandlerOptions
): (request: NextRequest) => Promise<NextResponse> {
  const mergedOptions: Required<ApiHandlerOptions> = {
    ...DEFAULT_HANDLER_OPTIONS,
    ...options
  };

  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      console.warn('[API Protection] No autenticado.');
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    const userId = session.user.id;
    const userIsSuperAdmin = session.user.isSuperAdmin === true;

    if (userIsSuperAdmin && mergedOptions.allowSuperAdminBypass) {
      console.log(
        `[API Protection] SuperAdmin ${userId} accediendo. Bypass activado.`
      );

      const authCtx: AuthenticatedRequestContext = {
        session,
        userId,
        businessId: session.user.businessId ?? 0
      };
      return handler(request, authCtx);
    }

    const businessId = session.user.businessId;
    if (
      mergedOptions.requiresBusiness &&
      (!businessId || typeof businessId !== 'number')
    ) {
      console.warn(
        `[API Protection] Usuario ${userId} sin businessId válido para ruta que lo requiere.`
      );
      return NextResponse.json(
        { message: 'Negocio no asociado o inválido.' },
        { status: 403 }
      );
    }

    if (mergedOptions.requiredRole && mergedOptions.requiredRole.length > 0) {
      const permissionResult = await checkPermission(
        userId,
        businessId!,
        mergedOptions.requiredRole
      );
      if (permissionResult instanceof NextResponse) {
        return permissionResult;
      }
    }

    if (mergedOptions.requiresActiveSubscription && businessId) {
      const businessSubData = await db.query.businesses.findFirst({
        where: eq(businesses.id, businessId),
        columns: {
          subscriptionStatus: true,
          stripeCurrentPeriodEnd: true,
          isLifetime: true
        }
      });

      if (!businessSubData) {
        return NextResponse.json(
          { message: 'Negocio no encontrado para verificar suscripción.' },
          { status: 404 }
        );
      }

      const hasLifetime = businessSubData.isLifetime === true;
      const isActiveSub = businessSubData.subscriptionStatus === 'active';
      let isTrialValid = false;
      if (
        businessSubData.subscriptionStatus === 'trialing' &&
        businessSubData.stripeCurrentPeriodEnd
      ) {
        isTrialValid =
          new Date(businessSubData.stripeCurrentPeriodEnd) > new Date();
      }

      if (!hasLifetime && !isActiveSub && !isTrialValid) {
        console.warn(
          `[API Protection] Negocio ${businessId} sin suscripción válida. Status: ${businessSubData.subscriptionStatus}`
        );
        return NextResponse.json(
          { message: 'Suscripción requerida o inválida para esta acción.' },
          { status: 402 }
        );
      }
    }

    const authCtx: AuthenticatedRequestContext = {
      session,
      userId,
      businessId: businessId!
    };
    return handler(request, authCtx);
  };
}
