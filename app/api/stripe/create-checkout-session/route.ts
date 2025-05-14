import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { businesses } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createCheckoutSessionSchema } from '@/lib/validators/stripe';
import Stripe from 'stripe';
import { getSessionInfo, checkPermission } from '@/lib/auth/utils';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY no está definida en las variables de entorno'
  );
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
  typescript: true
});

export async function POST(request: NextRequest) {
  const sessionInfo = await getSessionInfo(request);
  if (sessionInfo instanceof NextResponse) return sessionInfo;
  const { userId, businessId: currentBusinessId, session } = sessionInfo;
  const userEmail = session.user?.email;

  const permissionCheck = await checkPermission(userId, currentBusinessId, [
    'OWNER',
    'ADMIN'
  ]);
  if (permissionCheck instanceof NextResponse) return permissionCheck;

  let reqBody;
  try {
    reqBody = await request.json();
  } catch (error) {
    return NextResponse.json(
      { message: 'Cuerpo de la petición inválido.' },
      { status: 400 }
    );
  }

  const validation = createCheckoutSessionSchema.safeParse(reqBody);
  if (!validation.success) {
    return NextResponse.json(
      { message: 'Datos inválidos.', errors: validation.error.format() },
      { status: 400 }
    );
  }
  const { priceId } = validation.data;

  const businessData = await db.query.businesses.findFirst({
    where: eq(businesses.id, currentBusinessId),
    columns: { id: true, name: true, stripeCustomerId: true }
  });

  if (!businessData) {
    return NextResponse.json(
      { message: 'Negocio no encontrado.' },
      { status: 404 }
    );
  }

  let stripeCustomerId = businessData.stripeCustomerId;

  if (!stripeCustomerId) {
    console.log(
      `[Stripe Checkout] Creando nuevo cliente en Stripe para business ID: ${businessData.id}`
    );
    try {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        name: businessData.name || undefined,
        metadata: {
          cakelyBusinessId: businessData.id.toString(),
          cakelyUserId: userId
        }
      });
      stripeCustomerId = customer.id;

      await db
        .update(businesses)
        .set({ stripeCustomerId: stripeCustomerId, updatedAt: new Date() })
        .where(eq(businesses.id, businessData.id));
      console.log(
        `[Stripe Checkout] Cliente de Stripe ${stripeCustomerId} creado y guardado para business ID: ${businessData.id}`
      );
    } catch (error: any) {
      console.error(
        '[Stripe Checkout] Error creando cliente en Stripe:',
        error
      );
      return NextResponse.json(
        { message: 'Error al crear cliente en Stripe.', error: error.message },
        { status: 500 }
      );
    }
  } else {
    console.log(
      `[Stripe Checkout] Usando cliente de Stripe existente: ${stripeCustomerId} para business ID: ${businessData.id}`
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const successUrl = `${appUrl}/pago/exito?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/pago/cancelado`;

  try {
    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,

      metadata: {
        cakelyBusinessId: businessData.id.toString(),
        cakelyUserId: userId
      },
      subscription_data: {
        metadata: {
          cakelyBusinessId: businessData.id.toString(),
          cakelyUserId: userId
        }
      }
    };

    const session = await stripe.checkout.sessions.create(
      checkoutSessionParams
    );

    console.log(
      `[Stripe Checkout] Sesión de Checkout creada: ${session.id} para priceId: ${priceId}`
    );
    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error(
      '[Stripe Checkout] Error creando sesión de checkout en Stripe:',
      error
    );
    return NextResponse.json(
      { message: 'Error al crear sesión de checkout.', error: error.message },
      { status: 500 }
    );
  }
}
