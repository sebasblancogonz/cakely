import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { businesses, db, invitations, teamMembers, users } from '@/lib/db';
import { accounts, sessions, verificationTokens } from '@/lib/db';
import { and, asc, eq, gt } from 'drizzle-orm';
import { TeamRole } from '@/types/next-auth';
import type { JWT as NextAuthJWTContract } from 'next-auth/jwt';
import { PlanId, STRIPE_PRICE_ID_TO_PLAN_ID } from '@/config/plans';

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: '/login',
    error: '/auth/error'
  },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens
  }),
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

    async jwt({
      token,
      user,
      trigger,
      session: sessionUpdateData,
      account
    }): Promise<NextAuthJWTContract | null> {
      let currentUserId: string | undefined = undefined;
      if (token?.id && typeof token.id === 'string') {
        currentUserId = token.id;
      } else if (user?.id && typeof user.id === 'string') {
        currentUserId = user.id;
      } else if (token?.sub && typeof token.sub === 'string') {
        currentUserId = token.sub;
      }

      if (!currentUserId) {
        console.warn(
          '[AUTH JWT] No se pudo determinar currentUserId. Invalidando token.'
        );
        return null;
      }

      const workingToken: Partial<NextAuthJWTContract> & {
        id: string;
        isSuperAdmin: boolean;
      } = {
        ...token,
        id: currentUserId,
        isSuperAdmin: token.isSuperAdmin ?? false
      };

      const isInitialPopulation = !!user;
      const isSignUpTrigger = trigger === 'signUp';
      const isSpecificSubscriptionUpdate =
        trigger === 'update' &&
        sessionUpdateData?.triggerInfo?.event ===
          'SUBSCRIPTION_UPDATED_AFTER_PAYMENT';
      const isGenericUpdateTrigger =
        trigger === 'update' && !isSpecificSubscriptionUpdate;

      const needsFullDbRefresh =
        isInitialPopulation ||
        isSignUpTrigger ||
        isGenericUpdateTrigger ||
        workingToken.isSuperAdmin === undefined ||
        workingToken.businessId === undefined ||
        (workingToken.businessId !== undefined &&
          workingToken.subscriptionStatus === undefined);
      console.log('TRIGGER', trigger);
      console.log('SESSION UPDATE DATA', sessionUpdateData);
      if (isSpecificSubscriptionUpdate && sessionUpdateData?.triggerInfo) {
        console.log(
          '[AUTH JWT] Trigger "SUBSCRIPTION_UPDATED_AFTER_PAYMENT" con sessionUpdateData:',
          sessionUpdateData.triggerInfo
        );
        const {
          newSubscriptionStatus,
          newStripeCurrentPeriodEnd,
          newIsLifetime,
          businessId: updatedBusinessId
        } = sessionUpdateData.triggerInfo;

        if (updatedBusinessId !== undefined)
          workingToken.businessId = updatedBusinessId;
        workingToken.subscriptionStatus = newSubscriptionStatus ?? null;
        workingToken.stripeCurrentPeriodEnd = newStripeCurrentPeriodEnd ?? null;
        workingToken.isLifetime = newIsLifetime ?? false;

        if (updatedBusinessId && currentUserId) {
          const dbUserForBasicInfo = await db.query.users.findFirst({
            where: eq(users.id, currentUserId),
            columns: {
              name: true,
              email: true,
              image: true,
              isSuperAdmin: true
            }
          });
          if (dbUserForBasicInfo) {
            workingToken.name = dbUserForBasicInfo.name;
            workingToken.email = dbUserForBasicInfo.email;
            workingToken.picture = dbUserForBasicInfo.image;
            workingToken.isSuperAdmin =
              dbUserForBasicInfo.isSuperAdmin ?? false;
          }
          const membership = await db.query.teamMembers.findFirst({
            where: and(
              eq(teamMembers.userId, currentUserId),
              eq(teamMembers.businessId, updatedBusinessId)
            ),
            columns: { role: true }
          });
          workingToken.role = (membership?.role as TeamRole) ?? null;
        }
        console.log(
          '[AUTH JWT] Token actualizado con datos de suscripción desde triggerInfo.'
        );
      } else if (needsFullDbRefresh) {
        console.log(
          `[AUTH JWT] User ID: ${currentUserId}. Trigger: ${trigger}. Refrescando TODOS los datos desde DB. Initial: ${isInitialPopulation}, GenericUpdate: ${isGenericUpdateTrigger}, SignUp: ${isSignUpTrigger}`
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

        if (!dbUser) {
          console.warn(
            `[AUTH JWT] Usuario ${currentUserId} no encontrado en DB. Invalidando sesión.`
          );
          return null;
        }

        workingToken.name = dbUser.name;
        workingToken.email = dbUser.email;
        workingToken.picture = dbUser.image;
        workingToken.isSuperAdmin = dbUser.isSuperAdmin ?? false;

        workingToken.businessId = null;
        workingToken.role = null;
        workingToken.subscriptionStatus = null;
        workingToken.stripeCurrentPeriodEnd = null;
        workingToken.isLifetime = false;
        workingToken.planId = null;
        workingToken.stripePriceId = null;

        let effectiveBusinessId: number | null = dbUser.businessId;

        if (effectiveBusinessId) {
          const businessData = await db.query.businesses.findFirst({
            where: eq(businesses.id, effectiveBusinessId),
            columns: {
              id: true,
              name: true,
              subscriptionStatus: true,
              stripeCurrentPeriodEnd: true,
              isLifetime: true,
              stripePriceId: true
            }
          });
          console.log(
            `[AUTH JWT DEBUG - businessData (full refresh)] Para Business ID ${effectiveBusinessId}:`,
            JSON.stringify(businessData)
          );
          if (businessData) {
            const membership = await db.query.teamMembers.findFirst({
              where: and(
                eq(teamMembers.userId, currentUserId),
                eq(teamMembers.businessId, effectiveBusinessId)
              ),
              columns: { role: true }
            });
            if (membership) {
              workingToken.businessId = effectiveBusinessId;
              workingToken.role = membership.role as TeamRole;
              workingToken.subscriptionStatus =
                businessData.subscriptionStatus ?? null;
              workingToken.stripeCurrentPeriodEnd =
                businessData.stripeCurrentPeriodEnd
                  ? new Date(businessData.stripeCurrentPeriodEnd).toISOString()
                  : null;
              workingToken.isLifetime = businessData.isLifetime ?? false;
              workingToken.stripePriceId = businessData.stripePriceId ?? null;

              if (workingToken.isLifetime) {
                workingToken.planId = PlanId.VITALICIO;
              } else if (
                workingToken.subscriptionStatus === 'active' ||
                workingToken.subscriptionStatus === 'trialing'
              ) {
                const currentStripePriceId = businessData.stripePriceId;
                if (
                  currentStripePriceId &&
                  STRIPE_PRICE_ID_TO_PLAN_ID[currentStripePriceId]
                ) {
                  workingToken.planId =
                    STRIPE_PRICE_ID_TO_PLAN_ID[currentStripePriceId];
                } else {
                  workingToken.planId = null;
                }
              } else {
                workingToken.planId = null;
              }
              console.log(
                `[AUTH JWT] Plan asignado al token: ${workingToken.planId}`
              );
            } else {
              effectiveBusinessId = null;
            }
          } else {
            await db
              .update(users)
              .set({ businessId: null, updatedAt: new Date() })
              .where(eq(users.id, currentUserId));
            effectiveBusinessId = null;
          }
        }

        if (!workingToken.businessId && !effectiveBusinessId) {
          const firstMembership = await db.query.teamMembers.findFirst({
            where: eq(teamMembers.userId, currentUserId),
            orderBy: [asc(teamMembers.joinedAt)],
            with: {
              business: {
                columns: {
                  id: true,
                  name: true,
                  subscriptionStatus: true,
                  stripeCurrentPeriodEnd: true,
                  stripePriceId: true,
                  isLifetime: true
                }
              }
            }
          });
          if (firstMembership?.business) {
            workingToken.businessId = firstMembership.business.id;
            workingToken.role = firstMembership.role as TeamRole;
            workingToken.subscriptionStatus =
              firstMembership.business.subscriptionStatus ?? null;
            workingToken.stripeCurrentPeriodEnd = firstMembership.business
              .stripeCurrentPeriodEnd
              ? new Date(
                  firstMembership.business.stripeCurrentPeriodEnd
                ).toISOString()
              : null;
            workingToken.isLifetime =
              firstMembership.business.isLifetime ?? false;
            workingToken.planId =
              STRIPE_PRICE_ID_TO_PLAN_ID[
                firstMembership.business.stripePriceId ?? ''
              ] ?? null;
            workingToken.stripePriceId =
              firstMembership.business.stripePriceId ?? null;
          }
        }
      }

      if (isSignUpTrigger && user && workingToken.email && currentUserId) {
        const userEmailLower = workingToken.email.toLowerCase();
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

          const invitedBusinessData = await db.query.businesses.findFirst({
            where: eq(businesses.id, pendingInvite.businessId),
            columns: {
              subscriptionStatus: true,
              stripeCurrentPeriodEnd: true,
              isLifetime: true
            }
          });
          if (invitedBusinessData) {
            workingToken.subscriptionStatus =
              invitedBusinessData.subscriptionStatus ?? null;
            workingToken.stripeCurrentPeriodEnd =
              invitedBusinessData.stripeCurrentPeriodEnd
                ? new Date(
                    invitedBusinessData.stripeCurrentPeriodEnd
                  ).toISOString()
                : null;
            workingToken.isLifetime = invitedBusinessData.isLifetime ?? false;
            workingToken.planId =
              STRIPE_PRICE_ID_TO_PLAN_ID[
                invitedBusinessData.stripePriceId ?? ''
              ] ?? null;
            workingToken.stripePriceId =
              invitedBusinessData.stripePriceId ?? null;
          }
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
            console.error('Error en tx de signup con invitación:', e);
          }
        }
      }

      if (isGenericUpdateTrigger && sessionUpdateData) {
        console.log(
          '[AUTH JWT] Procesando trigger "update" GENÉRICO con sessionUpdateData (name/image):',
          sessionUpdateData
        );
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

        if (account.provider === 'google' && currentUserId) {
        }
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
      workingToken.planId = workingToken.planId ?? null;
      workingToken.stripePriceId = workingToken.stripePriceId ?? null;

      if (
        typeof workingToken.id !== 'string' ||
        typeof workingToken.isSuperAdmin !== 'boolean'
      ) {
        console.error(
          '[AUTH JWT] Error Crítico: Token final antes de retornar es inválido. Faltan id o isSuperAdmin, o sus tipos son incorrectos.',
          JSON.parse(JSON.stringify(workingToken))
        );
        return null;
      }

      console.log(
        `[AUTH JWT] Token FINAL a retornar:`,
        JSON.parse(JSON.stringify(workingToken))
      );
      return workingToken as NextAuthJWTContract;
    },

    async session({ session, token }) {
      console.log('[AUTH SESSION CALLBACK] Token recibido:', token);

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
        session.user.planId = token.planId;
        session.user.stripePriceId = token.stripePriceId;
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
