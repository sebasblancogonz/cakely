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
      const currentUserId = (token.id as string) ?? user?.id;
      const currentUserEmail = (token.email as string) ?? user?.email;

      if (!currentUserId || !currentUserEmail) {
        console.log('AUTH_CALLBACK JWT: Falta userId o user.email.');
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
            console.log(
              `AUTH_CALLBACK: SignUp - Invitación pendiente encontrada para ${userEmailLower}. Aceptando automáticamente.`
            );
            token.businessId = pendingInvite.businessId;
            token.role = pendingInvite.role as TeamRole;

            await db.transaction(async (tx) => {
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
            console.log(
              `AUTH_CALLBACK: SignUp - Usuario ${currentUserId} añadido al equipo ${pendingInvite.businessId} como ${pendingInvite.role}.`
            );
          } else {
            console.log(
              `AUTH_CALLBACK: SignUp - No se encontró invitación pendiente para ${userEmailLower}. No se asocia negocio.`
            );
            token.businessId = null;
            token.role = null;
          }
        } catch (error) {
          console.error(
            'AUTH_CALLBACK: SignUp - Error durante el procesamiento:',
            error
          );
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
          console.log(
            `AUTH_CALLBACK: Login/Update - Buscando info de equipo para user: ${currentUserId}. Token actual:`,
            { bId: token.businessId, role: token.role }
          );
          const membership = await db.query.teamMembers.findFirst({
            where: eq(teamMembers.userId, currentUserId),
            columns: { businessId: true, role: true },
            orderBy: [asc(teamMembers.joinedAt)]
          });

          if (membership) {
            token.businessId = membership.businessId;
            token.role = membership.role as TeamRole;
            console.log(
              `AUTH_CALLBACK: Login/Update - Info encontrada en DB:`,
              { bId: token.businessId, role: token.role }
            );
          } else {
            console.log(
              `AUTH_CALLBACK: Login/Update - User ${currentUserId} no encontrado en ningún equipo. Asignando null.`
            );
            token.businessId = null;
            token.role = null;
          }
        } else {
          console.log(
            `AUTH_CALLBACK: Login/Update - Info ya presente en token:`,
            { bId: token.businessId, role: token.role }
          );
        }
      }

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
      console.log('AUTH_CALLBACK: Session created/updated:', session.user);
      return session;
    }
  }
});
