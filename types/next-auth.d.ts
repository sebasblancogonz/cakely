import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id: string;
      businessId?: number | null;
    };
  }

  interface User extends DefaultUser {
    businessId?: number | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    businessId?: number | null;
  }
}
