import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, invitations, teamMembers } from '@/lib/db';
import { users, accounts, sessions, verificationTokens } from '@/lib/db';
import { and, asc, eq, gt } from 'drizzle-orm';
import { TeamRole } from '@/types/next-auth';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens
  }),
  // @ts-ignore
  allowDangerousEmailAccountLinking: true,
  providers: [
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
    async jwt({ token, user, trigger, session }) {
      const currentUserId = (token.id as string) ?? user?.id;
      const currentUserEmail = (token.email as string) ?? user?.email;

      if (trigger === 'update' && session) {
        if (session.name) {
          token.name = session.name;
        }
        if (session.image) {
          token.image = session.image;
        }
      }

      if (!currentUserId || !currentUserEmail) {
        return {
          ...token,
          businessId: token.businessId ?? null,
          role: token.role ?? null
        };
      }
      if (!token.id) {
        token.id = currentUserId;
      }

      if (trigger === 'signUp' && user) {
        console.log(
          `AUTH_CALLBACK: Procesando SignUp para ${currentUserEmail}...`
        );
        try {
          const userEmailLower = currentUserEmail.toLowerCase();
          const pendingInvite = await db.query.invitations.findFirst({
            where: and(
              eq(invitations.email, userEmailLower),
              eq(invitations.status, 'PENDING'),
              gt(invitations.expiresAt, new Date())
            ),
            columns: { id: true, businessId: true, role: true }
          });

          if (pendingInvite && pendingInvite.businessId) {
            token.businessId = pendingInvite.businessId;
            token.role = pendingInvite.role as TeamRole;

            await db.transaction(async (tx: any) => {
              await tx
                .insert(teamMembers)
                .values({
                  userId: currentUserId,
                  businessId: pendingInvite.businessId,
                  role: pendingInvite.role,
                  joinedAt: new Date()
                })
                .onConflictDoNothing();
              await tx
                .update(invitations)
                .set({ status: 'ACCEPTED' })
                .where(eq(invitations.id, pendingInvite.id));
            });
          } else {
            token.businessId = null;
            token.role = null;
          }
        } catch (error) {
          token.businessId = null;
          token.role = null;
        }
      } else if (currentUserId) {
        const needsDbCheck =
          token.businessId === undefined ||
          token.businessId === null ||
          token.role === undefined ||
          token.role === null;

        if (needsDbCheck) {
          const membership = await db.query.teamMembers.findFirst({
            where: eq(teamMembers.userId, currentUserId),
            columns: { businessId: true, role: true },
            orderBy: [asc(teamMembers.joinedAt)]
          });

          if (membership) {
            token.businessId = membership.businessId;
            token.role = membership.role as TeamRole;
          } else {
            token.businessId = null;
            token.role = null;
          }
        }
      }

      token.name = token.name ?? null;
      token.picture = token.picture ?? null;
      token.businessId = token.businessId ?? null;
      token.role = token.role ?? null;

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
      return session;
    }
  }
});
