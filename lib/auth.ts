import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, invitations, teamMembers } from '@/lib/db';
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  businesses
} from '@/lib/db';
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
      // USA DIRECTAMENTE LOS IDs COMO STRINGS (UUIDs)
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
      // Asegura token.id (string)
      if (!token.id) {
        token.id = currentUserId;
      }

      // --- Lógica de SIGNUP ---
      if (trigger === 'signUp' && user) {
        console.log(
          `AUTH_CALLBACK: Procesando SignUp para ${currentUserEmail}...`
        );
        try {
          const userEmailLower = currentUserEmail.toLowerCase();
          // 1. Buscar invitación PENDIENTE y válida
          const pendingInvite = await db.query.invitations.findFirst({
            where: and(
              eq(invitations.email, userEmailLower),
              eq(invitations.status, 'PENDING'),
              gt(invitations.expiresAt, new Date())
            ),
            // Necesitamos businessId (asumiendo que es number/integer) y role
            columns: { id: true, businessId: true, role: true }
          });

          // 2. Si se encuentra invitación...
          if (pendingInvite && pendingInvite.businessId) {
            // Asegura que businessId existe
            console.log(
              `AUTH_CALLBACK: SignUp - Invitación pendiente encontrada para ${userEmailLower}. Aceptando automáticamente.`
            );
            token.businessId = pendingInvite.businessId; // Asigna businessId (number)
            token.role = pendingInvite.role as TeamRole; // Asigna rol (string/enum)

            await db.transaction(async (tx) => {
              await tx
                .insert(teamMembers)
                .values({
                  userId: currentUserId, // <-- USA STRING UUID
                  businessId: pendingInvite.businessId, // <-- Usa NUMBER (o string si businessId es UUID)
                  role: pendingInvite.role,
                  joinedAt: new Date()
                })
                .onConflictDoNothing();
              // Asume que invitations.id es del tipo correcto (number o string/uuid)
              await tx
                .update(invitations)
                .set({ status: 'ACCEPTED' })
                .where(eq(invitations.id, pendingInvite.id));
            });
            console.log(
              `AUTH_CALLBACK: SignUp - Usuario ${currentUserId} añadido al equipo ${pendingInvite.businessId} como ${pendingInvite.role}.`
            );
          } else {
            // --- INVITACIÓN NO ENCONTRADA ---
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
          token.role = null; // Resetea en caso de error
        }
      }
      // --- Lógica de LOGIN / UPDATE (Usuario ya existente) ---
      else if (currentUserId) {
        // Usa el string ID para la condición
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
            // --- USA STRING UUID EN LA COMPARACIÓN ---
            where: eq(teamMembers.userId, currentUserId), // <-- FIX: Compara string con columna text/uuid
            columns: { businessId: true, role: true },
            orderBy: [asc(teamMembers.joinedAt)]
          });

          if (membership) {
            // Verifica si se encontró membresía
            token.businessId = membership.businessId; // Asigna businessId (probablemente number)
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

      // Asegurar valores nulos por defecto
      token.businessId = token.businessId ?? null;
      token.role = token.role ?? null;

      return token; // Devuelve el token final
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
