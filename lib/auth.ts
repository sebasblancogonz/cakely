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
  providers: [
    // @ts-ignore
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

    async jwt({ token, user, trigger, session: sessionUpdateData, account }) {
      let currentUserId: string | undefined = undefined;
      if (token?.id && typeof token.id === 'string') {
        currentUserId = token.id;
      } else if (user?.id && typeof user.id === 'string') {
        currentUserId = user.id;
      } else if (token?.sub && typeof token.sub === 'string') {
        currentUserId = token.sub;
      }

      console.log(
        `[AUTH JWT] Trigger: ${trigger}, User ID: ${currentUserId}, Incoming token sub: ${token?.sub}`
      );

      if (!currentUserId) {
        console.warn(
          '[AUTH JWT] No se pudo determinar currentUserId (ni de token.id, user.id, ni token.sub). Invalidando token.'
        );
        return null;
      }

      const workingToken: Partial<import('next-auth/jwt').JWT> & {
        id: string;
        isSuperAdmin?: boolean;
      } = {
        ...token,
        id: currentUserId
      };

      const needsDbRefresh =
        user ||
        workingToken.isSuperAdmin === undefined ||
        workingToken.businessId === undefined ||
        workingToken.role === undefined ||
        trigger === 'signUp' ||
        trigger === 'update';

      if (needsDbRefresh) {
        console.log(
          `[AUTH JWT] Necesita refrescar/poblar datos desde DB para user: ${currentUserId}`
        );
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, currentUserId),
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
          workingToken.name = dbUser.name;
          workingToken.email = dbUser.email;
          workingToken.picture = dbUser.image;
          workingToken.isSuperAdmin = dbUser.isSuperAdmin ?? false;

          let effectiveBusinessId: number | null = dbUser.businessId;
          let effectiveRole: TeamRole | null = null;
          let subStatus: string | null = null;
          let subPeriodEnd: string | null = null;
          let subIsLifetime: boolean = false;

          if (effectiveBusinessId) {
            const membership = await db.query.teamMembers.findFirst({
              where: and(
                eq(teamMembers.userId, dbUser.id),
                eq(teamMembers.businessId, effectiveBusinessId)
              ),
              columns: { role: true },
              with: {
                business: {
                  columns: {
                    id: true,
                    subscriptionStatus: true,
                    stripeCurrentPeriodEnd: true,
                    isLifetime: true
                  }
                }
              }
            });
            if (membership?.business) {
              effectiveRole = membership.role as TeamRole;
              subStatus = membership.business.subscriptionStatus ?? null;
              subPeriodEnd = membership.business.stripeCurrentPeriodEnd
                ? new Date(
                    membership.business.stripeCurrentPeriodEnd
                  ).toISOString()
                : null;
              subIsLifetime = membership.business.isLifetime ?? false;
            } else {
              effectiveBusinessId = null;
              effectiveRole = null;
            }
          }

          if (!effectiveBusinessId) {
            const firstMembership = await db.query.teamMembers.findFirst({
              where: eq(teamMembers.userId, dbUser.id),
              columns: { businessId: true, role: true },
              orderBy: [asc(teamMembers.joinedAt)],
              with: {
                business: {
                  columns: {
                    id: true,
                    subscriptionStatus: true,
                    stripeCurrentPeriodEnd: true,
                    isLifetime: true
                  }
                }
              }
            });
            if (firstMembership?.business) {
              effectiveBusinessId = firstMembership.businessId;
              effectiveRole = firstMembership.role as TeamRole;
              subStatus = firstMembership.business.subscriptionStatus ?? null;
              subPeriodEnd = firstMembership.business.stripeCurrentPeriodEnd
                ? new Date(
                    firstMembership.business.stripeCurrentPeriodEnd
                  ).toISOString()
                : null;
              subIsLifetime = firstMembership.business.isLifetime ?? false;
            }
          }
          workingToken.businessId = effectiveBusinessId;
          workingToken.role = effectiveRole;
          workingToken.subscriptionStatus = subStatus;
          workingToken.stripeCurrentPeriodEnd = subPeriodEnd;
          workingToken.isLifetime = subIsLifetime;
        } else {
          console.warn(
            `[AUTH JWT] Usuario ${currentUserId} referenciado en token/user no encontrado en DB. Invalidando sesión.`
          );
          return null;
        }
      }

      if (trigger === 'signUp' && user && workingToken.email) {
        const userEmailLower = workingToken.email.toLowerCase();
        console.log(`[AUTH JWT] Procesando SignUp para ${userEmailLower}`);
        const pendingInvite = await db.query.invitations.findFirst({
          where: and(
            eq(invitations.email, userEmailLower),
            eq(invitations.status, 'PENDING'),
            gt(invitations.expiresAt, new Date())
          ),
          columns: { id: true, businessId: true, role: true }
        });
        if (pendingInvite?.businessId) {
          workingToken.businessId = pendingInvite.businessId;
          workingToken.role = pendingInvite.role as TeamRole;
          try {
            await db.transaction(async (tx: any) => {
              await tx
                .insert(teamMembers)
                .values({
                  userId: currentUserId,
                  businessId: pendingInvite.businessId!,
                  role: pendingInvite.role,
                  joinedAt: new Date()
                })
                .onConflictDoNothing();
              await tx
                .update(invitations)
                .set({ status: 'ACCEPTED' })
                .where(eq(invitations.id, pendingInvite.id!));
            });
          } catch (e) {
            console.error('Error en tx de signup invite:', e);
          }
        } else if (!workingToken.businessId) {
          workingToken.businessId = null;
          workingToken.role = null;
        }
      }

      if (trigger === 'update' && sessionUpdateData) {
        if (sessionUpdateData.name !== undefined)
          workingToken.name = sessionUpdateData.name;
        if (sessionUpdateData.image !== undefined)
          workingToken.picture = sessionUpdateData.image;
      }

      if (account) {
        workingToken.accessToken = account.access_token;
        workingToken.accessTokenExpires = account.expires_at
          ? Date.now() + account.expires_at * 1000
          : undefined;
        workingToken.refreshToken =
          account.refresh_token ?? workingToken.refreshToken;
      }

      workingToken.isSuperAdmin = workingToken.isSuperAdmin ?? false;

      workingToken.name = workingToken.name ?? null;
      workingToken.email = workingToken.email ?? null;
      workingToken.picture = workingToken.picture ?? null;
      workingToken.businessId = workingToken.businessId ?? null;
      workingToken.role = workingToken.role ?? null;
      workingToken.subscriptionStatus = workingToken.subscriptionStatus ?? null;
      workingToken.stripeCurrentPeriodEnd =
        workingToken.stripeCurrentPeriodEnd ?? null;
      workingToken.isLifetime = workingToken.isLifetime ?? false;
      workingToken.accessToken = workingToken.accessToken ?? undefined;
      workingToken.refreshToken = workingToken.refreshToken ?? undefined;
      workingToken.accessTokenExpires =
        workingToken.accessTokenExpires ?? undefined;

      console.log(
        `[AUTH JWT] Token FINAL a retornar:`,
        JSON.parse(JSON.stringify(workingToken))
      );
      return workingToken as import('next-auth/jwt').JWT;
    },

    async session({ session, token }) {
      if (!token?.id) return session;
      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email as string;
        session.user.image = token.picture;
        session.user.isSuperAdmin = token.isSuperAdmin;
        session.user.businessId = token.businessId;
        session.user.role = token.role as TeamRole;
        session.user.subscriptionStatus = token.subscriptionStatus;
        session.user.stripeCurrentPeriodEnd = token.stripeCurrentPeriodEnd;
        session.user.isLifetime = token.isLifetime;
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
