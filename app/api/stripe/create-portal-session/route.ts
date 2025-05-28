import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { businesses } from '@/lib/db';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { getSessionInfo, checkPermission } from '@/lib/auth/utils';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY no está definida.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
  typescript: true
});

export async function POST(request: NextRequest) {
  const sessionInfo = await getSessionInfo(request);
  if (sessionInfo instanceof NextResponse) return sessionInfo;
  const { userId, businessId } = sessionInfo;

  const permissionCheck = await checkPermission(userId, businessId, [
    'OWNER',
    'ADMIN'
  ]);
  if (permissionCheck instanceof NextResponse) return permissionCheck;

  try {
    const businessData = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessId),
      columns: { stripeCustomerId: true }
    });

    if (!businessData || !businessData.stripeCustomerId) {
      return NextResponse.json(
        {
          message:
            'No se encontró información de cliente de Stripe para este negocio.'
        },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${appUrl}/ajustes/suscripcion?from_portal=true`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: businessData.stripeCustomerId,
      locale: 'es',
      return_url: returnUrl
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('[Stripe Portal] Error creando sesión del portal:', error);
    return NextResponse.json(
      {
        message: 'Error al crear sesión del portal de cliente.',
        error: error.message
      },
      { status: 500 }
    );
  }
}
