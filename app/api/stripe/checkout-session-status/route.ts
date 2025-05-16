import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
  typescript: true
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ message: 'Falta sessionId.' }, { status: 400 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    return NextResponse.json({
      status: checkoutSession.status,
      payment_status: checkoutSession.payment_status,
      customer_email:
        (checkoutSession.customer as Stripe.Customer)?.email ||
        checkoutSession.customer_details?.email,
      subscription_id: (checkoutSession.subscription as Stripe.Subscription)?.id
    });
  } catch (error: any) {
    console.error('[Checkout Status] Error recuperando sesión:', error);
    return NextResponse.json(
      {
        message: 'Error al recuperar la sesión de pago.',
        error: error.message
      },
      { status: 500 }
    );
  }
}
