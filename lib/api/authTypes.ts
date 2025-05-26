import { NextRequest, NextResponse } from 'next/server';
import { Session } from 'next-auth';
import { TeamRole } from '@/types/next-auth';
import { PlanFeatureConfig, PlanId } from '@/config/plans';

export interface ApiHandlerOptions {
  requiredRole?: TeamRole[];
  requiresBusiness?: boolean;
  requiresActiveSubscription?: boolean;
  allowSuperAdminBypass?: boolean;
  requiredFeature?: keyof PlanFeatureConfig;
  minimumPlan?: PlanId;
}

export interface AuthenticatedRequestContext {
  session: Session;
  userId: string;
  businessId: number;
  plan: PlanFeatureConfig;
}

export type ProtectedApiHandler<Params = Record<string, string | string[]>> = (
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) => Promise<NextResponse>;
