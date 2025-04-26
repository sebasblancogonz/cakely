import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  businesses
} from '@/lib/db';
import { eq } from 'drizzle-orm';
export const runtime = 'nodejs';
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens
  }),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
      }

      const currentUserId = token.id as string | undefined;

      if (user && currentUserId) {
        if (trigger === 'signUp') {
          try {
            console.log('v5: New user detected, creating business...');
            const newBusiness = await db
              .insert(businesses)
              .values({
                ownerUserId: currentUserId,
                name: `${user.name || user.email}'s Business`
              })
              .returning({ insertedId: businesses.id });

            if (newBusiness && newBusiness.length > 0) {
              const businessId = newBusiness[0].insertedId;
              console.log('v5: Created business with ID:', businessId);
              await db
                .update(users)
                .set({ businessId: businessId })
                .where(eq(users.id, currentUserId)); // Use currentUserId
              token.businessId = businessId;
              console.log('v5: User updated with businessId, token updated.');
            } else {
              console.error(
                'v5: Failed to create business for new user:',
                currentUserId
              );
            }
          } catch (error) {
            console.error(
              'v5: Error during business creation/user update:',
              error
            );
          }
        } else {
          if (token.businessId === undefined && currentUserId) {
            console.log(
              'v5: Existing user or missing businessId in token, fetching from DB for user:',
              currentUserId
            );
            const dbUser = await db.query.users.findFirst({
              where: eq(users.id, currentUserId),
              columns: { businessId: true }
            });
            token.businessId = dbUser?.businessId;
            console.log('v5: Fetched businessId from DB:', token.businessId);
          } else if (currentUserId) {
            console.log(
              'v5: Existing user, businessId already in token:',
              token.businessId
            );
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.businessId = token.businessId as number | undefined | null;
      }
      return session;
    }
  }
});
