import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, invitations, teamMembers, users } from '@/lib/db';
import { accounts, sessions, verificationTokens } from '@/lib/db';
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
  providers: [
    GoogleProvider({
      allowDangerousEmailAccountLinking: true,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
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
  secret: process.env.AUTH_SECRET,
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

    async jwt({ token, user, trigger, session: sessionUpdate, account }) {
      const currentUserId = token.id || user?.id;

      console.log(`[AUTH JWT] Trigger: ${trigger}, User ID: ${currentUserId}`);

      if (
        user ||
        !token.email ||
        token.isSuperAdmin === undefined ||
        token.businessId === undefined
      ) {
        if (currentUserId) {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, currentUserId as string),
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
              isSuperAdmin: true,
              businessId: true
            }
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.picture = dbUser.image;
            token.isSuperAdmin = dbUser.isSuperAdmin ?? false;

            if (dbUser.businessId) {
              token.businessId = dbUser.businessId;
              const membership = await db.query.teamMembers.findFirst({
                where: and(
                  eq(teamMembers.userId, currentUserId as string),
                  eq(teamMembers.businessId, dbUser.businessId)
                ),
                columns: { role: true }
              });
              token.role = (membership?.role as TeamRole | null) ?? null;
            } else {
              const firstMembership = await db.query.teamMembers.findFirst({
                where: eq(teamMembers.userId, currentUserId as string),
                columns: { businessId: true, role: true },
                orderBy: [asc(teamMembers.joinedAt)]
              });
              token.businessId = firstMembership?.businessId ?? null;
              token.role = (firstMembership?.role as TeamRole | null) ?? null;
            }
            console.log(
              `[AUTH JWT] DB User Data loaded for ${currentUserId}: isSuperAdmin=${token.isSuperAdmin}, businessId=${token.businessId}, role=${token.role}`
            );
          } else {
            token.isSuperAdmin = false;
            token.businessId = null;
            token.role = null;
          }
        }
      }

      if (trigger === 'signUp' && user && token.email) {
        const currentUserEmail = token.email.toLowerCase();
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
            where: eq(teamMembers.userId, currentUserId as string),
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

      if (trigger === 'update' && sessionUpdate) {
        console.log(
          '[AUTH JWT] Update trigger: Merging session data:',
          sessionUpdate
        );
        if (sessionUpdate.name) token.name = sessionUpdate.name;
        if (sessionUpdate.image) token.picture = sessionUpdate.image;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.accessTokenExpires = account.expires_at
          ? Date.now() + account.expires_at * 1000
          : undefined;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
      }

      token.isSuperAdmin = token.isSuperAdmin ?? false;
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
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
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
