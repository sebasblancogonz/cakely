import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { businesses } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    'STRIPE_SECRET_KEY no está definida en las variables de entorno'
  );
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
  typescript: true
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!endpointSecret) {
  console.error(
    'STRIPE_WEBHOOK_SECRET no está definida en las variables de entorno.'
  );
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  let rawBody: Buffer;
  try {
    const requestBuffer = await request.arrayBuffer();
    rawBody = Buffer.from(requestBuffer);
  } catch (error) {
    console.error(
      '[Stripe Webhook] Error leyendo el cuerpo de la petición:',
      error
    );
    return NextResponse.json(
      { message: 'Error leyendo el cuerpo de la petición' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) {
      console.error(
        '[Stripe Webhook] Error: Falta stripe-signature o endpointSecret.'
      );
      return NextResponse.json(
        { message: 'Configuración de Webhook incompleta.' },
        { status: 400 }
      );
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log(
      `[Stripe Webhook] Evento recibido y verificado: ${event.id}, Tipo: ${event.type}`
    );
  } catch (err: any) {
    console.error(
      `[Stripe Webhook] Error en la verificación de la firma: ${err.message}`
    );
    return NextResponse.json(
      { message: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const session = event.data.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = session as Stripe.Checkout.Session;
        console.log(
          `[Stripe Webhook] Checkout Session Completada para session ID: ${checkoutSession.id}`
        );

        const cakelyBusinessIdStr = checkoutSession.metadata?.cakelyBusinessId;

        if (
          checkoutSession.mode === 'subscription' &&
          checkoutSession.subscription &&
          checkoutSession.customer &&
          cakelyBusinessIdStr
        ) {
          const subscriptionId = checkoutSession.subscription as string;
          const stripeCustomerId = checkoutSession.customer as string;
          const cakelyBusinessId = parseInt(cakelyBusinessIdStr, 10);

          if (isNaN(cakelyBusinessId)) {
            console.error(
              `[Stripe Webhook] cakelyBusinessId inválido en metadata: ${cakelyBusinessIdStr}`
            );
            break;
          }

          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const firstItem = subscription.items.data[0];
          if (!firstItem) {
            console.error(
              `[Stripe Webhook] Suscripción ${subscriptionId} no tiene items.`
            );
            break;
          }
          const priceId = firstItem.price.id;
          const currentPeriodStart = new Date(
            firstItem.current_period_start * 1000
          );
          const currentPeriodEnd = new Date(
            firstItem.current_period_end * 1000
          );
          const subscriptionStatus = subscription.status;

          console.log(
            `[Stripe Webhook] Actualizando negocio ${cakelyBusinessId} con subscripción ${subscriptionId}, priceId ${priceId}, customerId ${stripeCustomerId}, periodEnd ${currentPeriodEnd.toISOString()}, status ${subscriptionStatus}`
          );

          await db
            .update(businesses)
            .set({
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: stripeCustomerId,
              stripePriceId: priceId,
              stripeCurrentPeriodEnd: currentPeriodEnd,
              subscriptionStatus: subscriptionStatus,
              updatedAt: new Date()
            })
            .where(eq(businesses.id, cakelyBusinessId));
          console.log(
            `[Stripe Webhook] Negocio ${cakelyBusinessId} actualizado tras checkout.session.completed.`
          );
        } else {
          console.warn(
            `[Stripe Webhook] Checkout session ${checkoutSession.id} no procesada: modo=${checkoutSession.mode}, sub=${checkoutSession.subscription}, cust=${checkoutSession.customer}, bizId=${cakelyBusinessIdStr}`
          );
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = session as Stripe.Invoice;
        console.log(`[Stripe Webhook] Factura Pagada: ${invoice.id}`);

        let subscriptionIdFromParent: string | null = null;
        if (invoice.parent && invoice.parent.type === 'subscription_details') {
          const subscriptionDetails = invoice.parent.subscription_details;
          if (typeof subscriptionDetails?.subscription === 'string') {
            subscriptionIdFromParent = subscriptionDetails.subscription;
          } else if (
            subscriptionDetails?.subscription &&
            typeof subscriptionDetails.subscription === 'object' &&
            'id' in subscriptionDetails.subscription
          ) {
            subscriptionIdFromParent = subscriptionDetails.subscription.id;
          }
        }

        if (
          invoice.status === 'paid' &&
          subscriptionIdFromParent &&
          invoice.billing_reason?.startsWith('subscription')
        ) {
          console.log(
            `[Stripe Webhook] Factura ${invoice.id} pagada para suscripción ${subscriptionIdFromParent}`
          );
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionIdFromParent
          );
          const cakelyBusinessIdStr = subscription.metadata?.cakelyBusinessId;

          if (!cakelyBusinessIdStr) {
            console.error(
              `[Stripe Webhook] Invoice.paid: No se encontró cakelyBusinessId en metadata de suscripción ${subscriptionIdFromParent}`
            );
            break;
          }
          const cakelyBusinessId = parseInt(cakelyBusinessIdStr, 10);
          if (isNaN(cakelyBusinessId)) {
            console.error(
              `[Stripe Webhook] Invoice.paid: cakelyBusinessId inválido en metadata de suscripción ${subscriptionIdFromParent}: ${cakelyBusinessIdStr}`
            );
            break;
          }

          const firstItem = subscription.items.data[0];
          if (!firstItem) {
            console.error(
              `[Stripe Webhook] Suscripción ${subscriptionIdFromParent} (invoice.paid) no tiene items.`
            );
            break;
          }
          const currentPeriodEndFromItem = new Date(
            firstItem.current_period_end * 1000
          );

          console.log(
            `[Stripe Webhook] Renovación. Actualizando periodo para business ${cakelyBusinessId} a ${currentPeriodEndFromItem.toISOString()}, status ${subscription.status}`
          );
          await db
            .update(businesses)
            .set({
              stripeCurrentPeriodEnd: currentPeriodEndFromItem,
              subscriptionStatus: subscription.status,
              updatedAt: new Date()
            })
            .where(and(eq(businesses.id, cakelyBusinessId)));
          console.log(
            `[Stripe Webhook] Periodo de negocio ${cakelyBusinessId} actualizado por invoice.paid.`
          );
        } else {
          console.log(
            `[Stripe Webhook] Invoice.paid ${invoice.id} no procesada: status=${invoice.status}, subId=${subscriptionIdFromParent}, reason=${invoice.billing_reason}`
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = session as Stripe.Invoice;
        console.log(`[Stripe Webhook] Fallo de Pago de Factura: ${invoice.id}`);
        let subscriptionIdFromParent: string | null = null;
        if (invoice.parent && invoice.parent.type === 'subscription_details') {
          const subscriptionDetails = invoice.parent.subscription_details;
          if (typeof subscriptionDetails?.subscription === 'string') {
            subscriptionIdFromParent = subscriptionDetails?.subscription;
          } else if (
            subscriptionDetails?.subscription &&
            typeof subscriptionDetails.subscription === 'object' &&
            'id' in subscriptionDetails.subscription
          ) {
            subscriptionIdFromParent = subscriptionDetails.subscription.id;
          }
        }

        if (subscriptionIdFromParent) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionIdFromParent
          );
          const cakelyBusinessIdStr = subscription.metadata?.cakelyBusinessId;
          if (cakelyBusinessIdStr) {
            const cakelyBusinessId = parseInt(cakelyBusinessIdStr, 10);
            if (isNaN(cakelyBusinessId)) {
              console.error(
                `[Stripe Webhook] cakelyBusinessId inválido en metadata de suscripción ${subscriptionIdFromParent}: ${cakelyBusinessIdStr}`
              );
              break;
            }
            console.log(
              `[Stripe Webhook] Pago fallido. Actualizando estado de negocio ${cakelyBusinessId} a ${subscription.status}`
            );
            await db
              .update(businesses)
              .set({
                subscriptionStatus: subscription.status,
                updatedAt: new Date()
              })
              .where(eq(businesses.id, cakelyBusinessId));
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = session as Stripe.Subscription;
        console.log(
          `[Stripe Webhook] Suscripción Actualizada: ${subscription.id}, Estado: ${subscription.status}`
        );
        const cakelyBusinessIdStr = subscription.metadata?.cakelyBusinessId;

        if (cakelyBusinessIdStr) {
          const cakelyBusinessId = parseInt(cakelyBusinessIdStr, 10);
          if (isNaN(cakelyBusinessId)) {
            console.error(
              `[Stripe Webhook] cakelyBusinessId inválido en metadata de suscripción ${subscription.id}: ${cakelyBusinessIdStr}`
            );
            break;
          }
          const priceId = subscription.items.data[0]?.price.id;

          const firstItem = subscription.items.data[0];
          if (!firstItem) {
            console.error(
              `[Stripe Webhook] Suscripción ${subscription.id} (updated) no tiene items.`
            );
            break;
          }
          const currentPeriodEnd = new Date(
            firstItem.current_period_end * 1000
          );

          console.log(
            `[Stripe Webhook] Actualizando negocio ${cakelyBusinessId} por customer.subscription.updated. PriceId: ${priceId}, PeriodEnd: ${currentPeriodEnd.toISOString()}, Status: ${subscription.status}`
          );
          await db
            .update(businesses)
            .set({
              stripePriceId: priceId,
              stripeCurrentPeriodEnd: currentPeriodEnd,
              subscriptionStatus: subscription.status,
              updatedAt: new Date()
            })
            .where(eq(businesses.id, cakelyBusinessId));
          console.log(
            `[Stripe Webhook] Negocio ${cakelyBusinessId} actualizado.`
          );
        } else {
          console.warn(
            `[Stripe Webhook] customer.subscription.updated: No se encontró cakelyBusinessId en metadata de suscripción ${subscription.id}`
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = session as Stripe.Subscription;
        console.log(
          `[Stripe Webhook] Suscripción Eliminada: ${subscription.id}, Estado: ${subscription.status}`
        );
        const cakelyBusinessIdStr = subscription.metadata?.cakelyBusinessId;

        if (cakelyBusinessIdStr) {
          const cakelyBusinessId = parseInt(cakelyBusinessIdStr, 10);
          if (isNaN(cakelyBusinessId)) {
            console.error(
              `[Stripe Webhook] cakelyBusinessId inválido en metadata de suscripción ${subscription.id}: ${cakelyBusinessIdStr}`
            );
            break;
          }
          console.log(
            `[Stripe Webhook] Suscripción para negocio ${cakelyBusinessId} marcada como cancelada.`
          );
          await db
            .update(businesses)
            .set({
              stripeSubscriptionId: null,
              stripePriceId: null,
              stripeCurrentPeriodEnd: null,
              subscriptionStatus: 'canceled',
              updatedAt: new Date()
            })
            .where(eq(businesses.id, cakelyBusinessId));
        } else {
          console.warn(
            `[Stripe Webhook] customer.subscription.deleted: No se encontró cakelyBusinessId en metadata de suscripción ${subscription.id}`
          );
        }
        break;
      }

      default:
        console.log(
          `[Stripe Webhook] Evento no manejado o no relevante: ${event.type}`
        );
    }
  } catch (error: any) {
    console.error(
      `[Stripe Webhook] Error procesando evento ${event.type} (ID: ${event.id}):`,
      error
    );

    return NextResponse.json(
      { message: `Error interno procesando webhook: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
