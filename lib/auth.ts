import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, teamMembers } from '@/lib/db';
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  businesses
} from '@/lib/db';
import { eq } from 'drizzle-orm';
import { TeamRole } from '@/types/next-auth';

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
    async jwt({ token, user, trigger, account, profile }) {
      const currentUserId = token.id ?? user?.id;

      if (!currentUserId) {
        return token;
      }
      if (!token.id) {
        token.id = currentUserId;
      }

      if (trigger === 'signUp' && user) {
        console.log('AUTH_CALLBACK: Handling SignUp...');
        try {
          const [newBusiness] = await db
            .insert(businesses)
            .values({
              ownerUserId: currentUserId,
              name: `${user.name || user.email || 'Nuevo'}'s Business`
            })
            .returning({ id: businesses.id });

          if (newBusiness?.id) {
            const businessId = newBusiness.id;
            token.businessId = businessId;
            token.role = 'OWNER';

            await db
              .insert(teamMembers)
              .values({
                userId: currentUserId,
                businessId: businessId,
                role: 'OWNER'
              })
              .onConflictDoNothing();

            console.log(
              `AUTH_CALLBACK: SignUp successful. Business: ${businessId}, Role: OWNER`
            );
          } else {
            console.error(
              'AUTH_CALLBACK: SignUp - Failed to create business for user:',
              currentUserId
            );
            token.businessId = null;
            token.role = null;
          }
        } catch (error) {
          console.error(
            'AUTH_CALLBACK: SignUp - Error creating business/team member:',
            error
          );
          token.businessId = null;
          token.role = null;
        }
      } else if (currentUserId) {
        if (token.businessId === undefined || token.role === undefined) {
          console.log(
            `AUTH_CALLBACK: Login/Update - Fetching team info for user: ${currentUserId}`
          );
          const membership = await db.query.teamMembers.findFirst({
            where: eq(teamMembers.userId, currentUserId as string),
            columns: { businessId: true, role: true }
          });

          if (membership) {
            token.businessId = membership.businessId;
            token.role = membership.role as any;
            console.log(`AUTH_CALLBACK: Login/Update - Found team info:`, {
              bId: token.businessId,
              role: token.role
            });
          } else {
            console.log(
              `AUTH_CALLBACK: Login/Update - User ${currentUserId} not found in any team.`
            );
            token.businessId = null;
            token.role = null;
          }
        } else {
          console.log(`AUTH_CALLBACK: Login/Update - Info already in token:`, {
            bId: token.businessId,
            role: token.role
          });
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      if (session.user) {
        session.user.businessId = Number(token.businessId) ?? null;
        session.user.role = (token.role as TeamRole) ?? null;
      }
      console.log('AUTH_CALLBACK: Session created/updated:', session.user);
      return session;
    }
  }
});
