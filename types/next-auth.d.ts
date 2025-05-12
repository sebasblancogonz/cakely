import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { teamRoleEnum } from '@/lib/db';

type TeamRole = (typeof teamRoleEnum.enumValues)[number];
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      businessId?: number | null;
      role: TeamRole | null;
      isSuperAdmin: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    businessId?: number | null;

    isSuperAdmin?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    businessId?: number | null;
    role?: TeamRole | null;
    isSuperAdmin: boolean;
  }
}
