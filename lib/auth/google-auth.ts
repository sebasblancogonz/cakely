import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '@/lib/db';
import { accounts } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function getGoogleAuthClient(
  userId: string
): Promise<OAuth2Client | null> {
  console.log(`[Google Auth] Obteniendo cliente para usuario: ${userId}`);
  try {
    const [googleAccount] = await db
      .select({
        id: accounts.providerAccountId,
        accessToken: accounts.access_token,
        refreshToken: accounts.refresh_token,
        expiresAt: accounts.expires_at
      })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google')))
      .limit(1);

    if (!googleAccount) {
      console.warn(
        `[Google Auth] No se encontró cuenta Google para usuario ${userId}.`
      );
      return null;
    }
    if (!googleAccount.refreshToken) {
      console.warn(
        `[Google Auth] No hay refresh token para usuario ${userId}. Necesita re-autenticar.`
      );

      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    const expiryDateMs = googleAccount.expiresAt
      ? googleAccount.expiresAt * 1000
      : null;

    oauth2Client.setCredentials({
      access_token: googleAccount.accessToken,
      refresh_token: googleAccount.refreshToken,

      expiry_date: expiryDateMs
    });

    const bufferMs = 60 * 1000;
    const nowMs = Date.now();
    let needsRefresh = false;

    if (typeof expiryDateMs === 'number') {
      if (expiryDateMs <= nowMs + bufferMs) {
        console.log(
          `[Auth Util] Token for user ${userId} expired or expiring soon (Expiry: ${new Date(expiryDateMs).toISOString()}). Flagging for refresh.`
        );
        needsRefresh = true;
      } else {
        console.log(
          `[Auth Util] Token for user ${userId} is still valid (Expiry: ${new Date(expiryDateMs).toISOString()}).`
        );
      }
    } else {
      console.warn(
        `[Auth Util] Invalid or missing expiry_date for user ${userId}. Flagging for refresh attempt.`
      );
      needsRefresh = true;
    }

    if (needsRefresh) {
      console.log(
        `[Google Auth] Token para usuario ${userId} expirado/expirando. Refrescando...`
      );
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        const newAccessToken = credentials.access_token;

        const newRefreshToken =
          credentials.refresh_token ?? googleAccount.refreshToken;
        const newExpiryDate = credentials.expiry_date;
        const newExpiresAtSeconds = newExpiryDate
          ? Math.floor(newExpiryDate / 1000)
          : null;

        console.log(
          `[Google Auth] Token refrescado para usuario ${userId}. Nueva expiración: ${newExpiryDate}`
        );

        if (googleAccount.id) {
          await db
            .update(accounts)
            .set({
              access_token: newAccessToken,
              refresh_token: newRefreshToken,
              expires_at: newExpiresAtSeconds,
              updatedAt: new Date()
            })
            .where(eq(accounts.providerAccountId, googleAccount.id));
        }
      } catch (refreshError: any) {
        console.error(
          `[Google Auth] FALLO al refrescar token para usuario ${userId}:`,
          refreshError?.response?.data || refreshError.message
        );

        await db
          .update(accounts)
          .set({
            access_token: null,
            refresh_token: null,
            expires_at: null,
            updatedAt: new Date()
          })
          .where(eq(accounts.providerAccountId, googleAccount.id));
        return null;
      }
    } else {
      console.log(`[Google Auth] Token para usuario ${userId} todavía válido.`);
    }

    return oauth2Client;
  } catch (error) {
    console.error(
      `[Google Auth] Error general obteniendo cliente Google para usuario ${userId}:`,
      error
    );
    return null;
  }
}
