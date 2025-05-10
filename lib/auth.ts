import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, invitations, teamMembers, users } from '@/lib/db';
import { accounts, sessions, verificationTokens, teamRoleEnum } from '@/lib/db';
import { and, asc, eq, gt } from 'drizzle-orm';
import { TeamRole } from '@/types/next-auth';
import { z } from 'zod';

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
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/calendar.events'
          ].join(' ')
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        const userEmail = profile?.email;
        if (!userEmail) {
          console.log(
            `AUTH SIGNIN: OAuth (${account.provider}) sin email. Denegado.`
          );
          return false;
        }
        const userEmailLower = userEmail.toLowerCase();

        console.log(
          `AUTH SIGNIN: Verificando usuario existente para ${userEmailLower}`
        );
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, userEmailLower),
          columns: { id: true }
        });

        if (existingUser) {
          console.log(
            `AUTH SIGNIN: Usuario existente (${existingUser.id}) encontrado. Permitiendo inicio de sesión.`
          );
          return true;
        }

        console.log(
          `AUTH SIGNIN: Usuario NO existente. Buscando invitación pendiente para ${userEmailLower}...`
        );
        const pendingInvite = await db.query.invitations.findFirst({
          where: and(
            eq(invitations.email, userEmailLower),
            eq(invitations.status, 'PENDING'),
            gt(invitations.expiresAt, new Date())
          ),
          columns: { id: true }
        });

        if (pendingInvite) {
          console.log(
            `AUTH SIGNIN: Invitación pendiente encontrada para ${userEmailLower}. Permitiendo registro...`
          );
          return true;
        } else {
          console.log(
            `AUTH SIGNIN: Usuario ${userEmailLower} NO existente y SIN invitación válida. Denegando acceso.`
          );
          return '/auth/denied?error=NoInvitation';
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session, account }) {
      const currentUserId = (token.id as string) ?? user?.id;
      const currentUserEmail = (token.email as string) ?? user?.email;

      if (account) {
        console.log(
          "AUTH JWT - Callback received 'account' object:",
          JSON.stringify(account, null, 2)
        );
        // Comprueba explícitamente si refresh_token existe en este objeto
        console.log(
          "AUTH JWT - Refresh token present in received 'account' object?",
          !!account.refresh_token
        );
      }

      if (trigger === 'update' && session) {
        console.log(
          'AUTH JWT: Update trigger detected. Merging session data:',
          session
        );
        if (session.name) {
          token.name = session.name;
        }
        if (session.image) {
          token.picture = session.image;
        }
      }

      if (!currentUserId || !currentUserEmail) {
        return { ...token, businessId: null, role: null };
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
                .where(eq(invitations.id, pendingInvite.id)); // Assuming id is number
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

          if (membership && membership.businessId) {
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

      if (account) {
        console.log(
          `AUTH JWT: Processing account info from provider ${account.provider}`
        );
        token.accessToken = account.access_token;
        token.accessTokenExpires = account.expires_at
          ? Date.now() + account.expires_at * 1000
          : undefined;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        console.log(
          `AUTH JWT: Tokens updated in JWT. AccessTokenExpires: ${token.accessTokenExpires ? new Date(token.accessTokenExpires as string).toISOString() : 'N/A'}, RefreshToken Received: ${!!account.refresh_token}`
        );
      }

      if (account && account.provider === 'google' && currentUserId) {
        try {
          console.log(
            `AUTH JWT: Attempting manual DB upsert for account tokens of user ${currentUserId}`
          );
          await db
            .insert(accounts)
            .values({
              userId: currentUserId,
              type: account.type ?? 'oauth',
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state
            })
            .onConflictDoUpdate({
              target: [accounts.provider, accounts.providerAccountId],
              set: {
                access_token: account.access_token,
                refresh_token: account.refresh_token ?? undefined,
                expires_at: account.expires_at,
                id_token: account.id_token,
                scope: account.scope,
                session_state: account.session_state,
                token_type: account.token_type
              }
            });
          console.log(
            `AUTH JWT: Manual DB upsert finished for user ${currentUserId}`
          );
        } catch (dbError) {
          console.error(
            'AUTH JWT: Error during manual account token upsert:',
            dbError
          );
        }
      }

      token.name = token.name ?? user?.name ?? null;
      token.picture = token.picture ?? user?.image ?? null;
      token.businessId = token.businessId ?? null;
      token.role = token.role ?? null;
      token.accessToken = token.accessToken ?? null;
      token.accessTokenExpires = token.accessTokenExpires ?? null;
      token.refreshToken = token.refreshToken ?? null;

      return token;
    },

    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      if (session.user) {
        session.user.businessId = Number(token.businessId) ?? null;
        session.user.role = (token.role as TeamRole) ?? null;
        session.user.image = token.picture ?? null;
        session.user.name = token.name ?? null;
      }
      return session;
    }
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? `__Secure-authjs.session-token`
          : `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain:
          process.env.NODE_ENV === 'production' ? '.cakely.es' : 'localhost'
      }
    }
  }
});
