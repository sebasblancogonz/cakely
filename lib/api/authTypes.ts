import { NextRequest, NextResponse } from 'next/server';
import { Session } from 'next-auth';
import { TeamRole } from '@/types/next-auth';

export interface ApiHandlerOptions {
  requiredRole?: TeamRole[];
  requiresBusiness?: boolean;
  requiresActiveSubscription?: boolean;
  allowSuperAdminBypass?: boolean;
}

export interface AuthenticatedRequestContext {
  session: Session;
  userId: string;
  businessId: number;
}

export type ProtectedApiHandler<Params = Record<string, string | string[]>> = (
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) => Promise<NextResponse>;
