import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { teamRoleEnum } from '@/lib/db';
import type { JWT as NextAuthJWT } from 'next-auth/jwt';

type TeamRole = (typeof teamRoleEnum.enumValues)[number];
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      businessId?: number | null;
      role: TeamRole | null;
      isSuperAdmin: boolean;
      subscriptionStatus?: string | null;
      stripeCurrentPeriodEnd?: string | null;
      isLifetime?: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    businessId?: number | null;

    isSuperAdmin?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends NextAuthJWT {
    id: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    businessId?: number | null;
    role?: TeamRole | null;
    isSuperAdmin: boolean;
    subscriptionStatus?: string | null;
    stripeCurrentPeriodEnd?: string | null;
    isLifetime?: boolean;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
}
