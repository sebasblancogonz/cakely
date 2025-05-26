import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, businesses } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  ApiHandlerOptions,
  AuthenticatedRequestContext,
  ProtectedApiHandler
} from './authTypes';
import { checkPermission } from '@/lib/auth/utils';
import {
  getPlanConfig,
  PlanId,
  PlanFeatureConfig,
  STRIPE_PRICE_ID_TO_PLAN_ID,
  PLANS_CONFIG
} from '@/config/plans';

const BASE_HANDLER_OPTIONS: ApiHandlerOptions = {
  requiredRole: [],
  requiresBusiness: true,
  requiresActiveSubscription: true,
  allowSuperAdminBypass: true
};

export function withApiProtection<Params = Record<string, string | string[]>>(
  handler: ProtectedApiHandler<Params>,
  options?: ApiHandlerOptions
): (
  request: NextRequest,
  context: { params: Params }
) => Promise<NextResponse> {
  const mergedOptions: ApiHandlerOptions = {
    ...BASE_HANDLER_OPTIONS,
    ...options
  };

  if (mergedOptions.requiredRole === undefined) {
    mergedOptions.requiredRole = [];
  }

  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    const {
      id: userId,
      isSuperAdmin: userIsSuperAdminInSession,
      businessId: userSessionBusinessId,
      stripePriceId: userSessionStripePriceId,
      isLifetime: userSessionIsLifetime,
      subscriptionStatus: userSessionSubscriptionStatus,
      planId: userSessionPlanId
    } = session.user;

    const isSuperAdmin = userIsSuperAdminInSession === true;

    if (isSuperAdmin && mergedOptions.allowSuperAdminBypass) {
      const superAdminPlanConfig = PLANS_CONFIG[PlanId.VITALICIO];
      const authCtxSuperAdmin: AuthenticatedRequestContext = {
        session,
        userId,
        businessId: userSessionBusinessId ?? 0,
        plan: superAdminPlanConfig
      };
      return handler(request, authCtxSuperAdmin);
    }

    const currentActiveBusinessId = userSessionBusinessId;

    if (mergedOptions.requiresBusiness) {
      if (
        !currentActiveBusinessId ||
        typeof currentActiveBusinessId !== 'number'
      ) {
        return NextResponse.json(
          { message: 'Negocio no asociado o inválido.' },
          { status: 403 }
        );
      }

      if (mergedOptions.requiredRole!.length > 0) {
        const permissionResult = await checkPermission(
          userId,
          currentActiveBusinessId,
          mergedOptions.requiredRole!
        );
        if (permissionResult instanceof NextResponse) return permissionResult;
      }
    }

    let finalBusinessPlanConfig: PlanFeatureConfig = getPlanConfig(
      null,
      false,
      null
    );
    let actualBusinessPlanId: PlanId | null = PlanId.FREE;

    if (
      currentActiveBusinessId &&
      (mergedOptions.requiresActiveSubscription ||
        mergedOptions.minimumPlan ||
        mergedOptions.requiredFeature)
    ) {
      const businessDataFromDb = await db.query.businesses.findFirst({
        where: eq(businesses.id, currentActiveBusinessId),
        columns: {
          subscriptionStatus: true,
          stripeCurrentPeriodEnd: true,
          isLifetime: true,
          stripePriceId: true
        }
      });

      if (!businessDataFromDb) {
        return NextResponse.json(
          { message: 'Negocio no encontrado para verificar suscripción.' },
          { status: 404 }
        );
      }
      finalBusinessPlanConfig = getPlanConfig(
        businessDataFromDb.stripePriceId,
        businessDataFromDb.isLifetime,
        businessDataFromDb.subscriptionStatus
      );
      if (businessDataFromDb.isLifetime)
        actualBusinessPlanId = PlanId.VITALICIO;
      else if (
        businessDataFromDb.stripePriceId &&
        STRIPE_PRICE_ID_TO_PLAN_ID[businessDataFromDb.stripePriceId]
      )
        actualBusinessPlanId =
          STRIPE_PRICE_ID_TO_PLAN_ID[businessDataFromDb.stripePriceId];
      else actualBusinessPlanId = PlanId.FREE;

      if (mergedOptions.requiresActiveSubscription) {
        const hasLifetimeDb = businessDataFromDb.isLifetime === true;
        const isActiveSubDb =
          businessDataFromDb.subscriptionStatus === 'active';
        let isTrialValidDb = false;
        if (
          businessDataFromDb.subscriptionStatus === 'trialing' &&
          businessDataFromDb.stripeCurrentPeriodEnd
        ) {
          isTrialValidDb =
            new Date(businessDataFromDb.stripeCurrentPeriodEnd) > new Date();
        }
        if (!hasLifetimeDb && !isActiveSubDb && !isTrialValidDb) {
          return NextResponse.json(
            { message: 'Suscripción requerida o inválida.' },
            { status: 402 }
          );
        }
      }
    }

    if (mergedOptions.minimumPlan && actualBusinessPlanId) {
      const planHierarchy = [
        PlanId.FREE,
        PlanId.BASICO,
        PlanId.PRO,
        PlanId.VITALICIO
      ];
      if (
        planHierarchy.indexOf(actualBusinessPlanId) <
        planHierarchy.indexOf(mergedOptions.minimumPlan)
      ) {
        return NextResponse.json(
          {
            message: `Esta acción requiere al menos el plan ${mergedOptions.minimumPlan}. Tu plan actual es ${actualBusinessPlanId}.`
          },
          { status: 403 }
        );
      }
    }

    if (mergedOptions.requiredFeature) {
      if (!currentActiveBusinessId && !isSuperAdmin) {
        return NextResponse.json(
          {
            message:
              'Se requiere un negocio con un plan que incluya esta característica.'
          },
          { status: 403 }
        );
      }
      if (!finalBusinessPlanConfig[mergedOptions.requiredFeature]) {
        return NextResponse.json(
          {
            message: `Tu plan actual no incluye la característica: '${mergedOptions.requiredFeature}'.`
          },
          { status: 403 }
        );
      }
    }

    const authCtx: AuthenticatedRequestContext = {
      session,
      userId,
      businessId: currentActiveBusinessId!,
      plan: finalBusinessPlanConfig
    };
    return handler(request, authCtx);
  };
}
