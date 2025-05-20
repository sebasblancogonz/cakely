import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { businesses } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY no está definida en las variables de entorno'
  );
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
  typescript: true
});

const MAX_DB_CHECK_RETRIES = 5;
const DB_CHECK_INTERVAL_MS = 1200;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.businessId) {
    return NextResponse.json(
      { message: 'No autorizado o negocio no identificado.' },
      { status: 401 }
    );
  }
  const cakelyUserId = session.user.id;
  const cakelyBusinessId = session.user.businessId;

  const { searchParams } = new URL(request.url);
  const stripeCheckoutSessionId = searchParams.get('sessionId');

  if (!stripeCheckoutSessionId || !stripeCheckoutSessionId.startsWith('cs_')) {
    return NextResponse.json(
      { message: 'ID de sesión de Checkout inválido.' },
      { status: 400 }
    );
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(
      stripeCheckoutSessionId,
      {
        expand: ['subscription', 'customer']
      }
    );

    if (
      checkoutSession.metadata?.cakelyBusinessId !== cakelyBusinessId.toString()
    ) {
      console.warn(
        `[Checkout Status API] Discrepancia de businessId. Metadata: ${checkoutSession.metadata?.cakelyBusinessId}, Sesión: ${cakelyBusinessId}`
      );
      return NextResponse.json(
        { message: 'La sesión de pago no pertenece al negocio actual.' },
        { status: 403 }
      );
    }

    let businessInDb;
    let dbReflectsSuccess = false;
    let retrievedSubscriptionFromStripe: Stripe.Subscription | null = null;

    if (
      checkoutSession.subscription &&
      typeof checkoutSession.subscription === 'object'
    ) {
      retrievedSubscriptionFromStripe =
        checkoutSession.subscription as Stripe.Subscription;
    } else if (typeof checkoutSession.subscription === 'string') {
      retrievedSubscriptionFromStripe = await stripe.subscriptions.retrieve(
        checkoutSession.subscription
      );
    }
    const stripeSubscriptionIdFromSession = retrievedSubscriptionFromStripe?.id;

    if (
      checkoutSession.payment_status === 'paid' ||
      checkoutSession.status === 'complete' ||
      (checkoutSession.status === 'open' &&
        checkoutSession.payment_status === 'unpaid')
    ) {
      console.log(
        `[Checkout Status API] Stripe Checkout Session ${stripeCheckoutSessionId} exitosa. Verificando DB...`
      );
      for (let i = 0; i < MAX_DB_CHECK_RETRIES; i++) {
        businessInDb = await db.query.businesses.findFirst({
          where: eq(businesses.id, cakelyBusinessId),
          columns: {
            subscriptionStatus: true,
            stripeCurrentPeriodEnd: true,
            isLifetime: true,
            stripeSubscriptionId: true
          }
        });

        const stripeSubIdFromStripeObject = retrievedSubscriptionFromStripe?.id;
        const statusFromStripeObject = retrievedSubscriptionFromStripe?.status;

        console.log(
          `[Checkout Status API] Intento DB ${i + 1} para BIZ ${cakelyBusinessId}: Status en DB=${businessInDb?.subscriptionStatus}, SubId en DB=${businessInDb?.stripeSubscriptionId}, Stripe SubId Esperado=${stripeSubIdFromStripeObject}, Stripe Status Esperado=${statusFromStripeObject}`
        );

        const isTrialingInDb =
          businessInDb?.subscriptionStatus === 'trialing' &&
          businessInDb.stripeCurrentPeriodEnd &&
          new Date(businessInDb.stripeCurrentPeriodEnd) > new Date();
        const isActiveInDb = businessInDb?.subscriptionStatus === 'active';

        if (
          businessInDb &&
          (isActiveInDb || isTrialingInDb) &&
          businessInDb.stripeSubscriptionId === stripeSubIdFromStripeObject
        ) {
          dbReflectsSuccess = true;
          console.log(
            `[Checkout Status API] Confirmado: DB actualizada para BIZ ${cakelyBusinessId}. Status DB: ${businessInDb.subscriptionStatus}.`
          );
          break;
        }
        if (i < MAX_DB_CHECK_RETRIES - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, DB_CHECK_INTERVAL_MS)
          );
        }
      }

      if (!dbReflectsSuccess) {
        console.warn(
          `[Checkout Status API] DB NO actualizada para BIZ ${cakelyBusinessId} después de reintentos. Devolviendo statusNeedsRefresh.`
        );
        return NextResponse.json(
          {
            message:
              'El pago fue procesado por Stripe, pero estamos actualizando tu cuenta. Por favor, espera unos momentos y refresca tu panel.',
            stripeCheckoutStatus: checkoutSession.status,
            stripePaymentStatus: checkoutSession.payment_status,
            statusNeedsRefresh: true
          },
          { status: 202 }
        );
      }
    }

    const customerObject = checkoutSession.customer as Stripe.Customer | null;

    return NextResponse.json({
      stripeCheckoutStatus: checkoutSession.status,
      stripePaymentStatus: checkoutSession.payment_status,
      stripeSubscriptionId: stripeSubscriptionIdFromSession,
      customerEmail:
        customerObject?.email || checkoutSession.customer_details?.email,
      cakelySubscriptionStatus: businessInDb?.subscriptionStatus ?? null,
      cakelyStripeCurrentPeriodEnd:
        businessInDb?.stripeCurrentPeriodEnd?.toISOString() ?? null,
      cakelyIsLifetime: businessInDb?.isLifetime ?? false,
      statusNeedsRefresh: false
    });
  } catch (error: any) {
    console.error(
      `[Checkout Status API] Error recuperando/procesando sesión ${stripeCheckoutSessionId}:`,
      error
    );
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          message: `Error de Stripe: ${error.message}`,
          stripeErrorCode: error.code
        },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      {
        message: 'Error interno al recuperar la sesión de pago.',
        error: error.message
      },
      { status: 500 }
    );
  }
}
