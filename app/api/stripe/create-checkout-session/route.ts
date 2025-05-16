import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, teamMembers, users } from '@/lib/db';
import { businesses } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createCheckoutSessionSchema } from '@/lib/validators/stripe';
import Stripe from 'stripe';
import { checkPermission } from '@/lib/auth/utils';
import { TeamRoleEnum } from '@/types/types';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY no está definida en las variables de entorno'
  );
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
  typescript: true
});

const TRIAL_PERIOD_DAYS = 14;

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    console.warn(
      '[Stripe Checkout] No autorizado - Falta sesión completa del usuario.'
    );
    return NextResponse.json(
      { message: 'No autorizado - Se requiere inicio de sesión.' },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const userEmail = session.user.email;
  const userName = session.user.name;
  let currentBusinessId = session.user.businessId;

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
  const { priceId, isTrial } = validation.data;

  let targetBusinessId = currentBusinessId;
  let businessForStripe: {
    id: number;
    name: string | null;
    stripeCustomerId: string | null;
  } | null = null;

  if (!targetBusinessId) {
    console.log(
      `[Stripe Checkout] Usuario ${userId} no tiene negocio. Creando uno por defecto.`
    );
    const defaultBusinessName = userName
      ? `Pastelería de ${userName.split(' ')[0]}`
      : `Mi Negocio (${userId.substring(0, 6)})`;
    try {
      const newBusinessArray = await db
        .insert(businesses)
        .values({
          ownerUserId: userId,
          name: defaultBusinessName,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({
          id: businesses.id,
          name: businesses.name,
          stripeCustomerId: businesses.stripeCustomerId
        });

      if (!newBusinessArray || newBusinessArray.length === 0) {
        throw new Error('La creación del negocio no devolvió resultados.');
      }
      const newBusiness = newBusinessArray[0];
      targetBusinessId = newBusiness.id;

      await db
        .insert(teamMembers)
        .values({
          userId: userId,
          businessId: targetBusinessId,
          role: TeamRoleEnum.OWNER,
          joinedAt: new Date()
        })
        .onConflictDoNothing();

      await db
        .update(users)
        .set({ businessId: targetBusinessId })
        .where(eq(users.id, userId));

      businessForStripe = {
        id: newBusiness.id,
        name: newBusiness.name,
        stripeCustomerId: newBusiness.stripeCustomerId
      };
      console.log(
        `[Stripe Checkout] Negocio por defecto <span class="math-inline">\{targetBusinessId\} \('</span>{newBusiness.name}') creado y asignado a usuario ${userId}.`
      );
    } catch (dbError: any) {
      console.error(
        '[Stripe Checkout] Error creando negocio por defecto:',
        dbError
      );
      return NextResponse.json(
        {
          message: 'Error al configurar tu cuenta de negocio.',
          error: dbError.message
        },
        { status: 500 }
      );
    }
  } else {
    const existingBusiness = await db.query.businesses.findFirst({
      where: eq(businesses.id, targetBusinessId),
      columns: { id: true, name: true, stripeCustomerId: true }
    });
    if (!existingBusiness) {
      console.error(
        `[Stripe Checkout] Error: businessId ${targetBusinessId} en sesión no encontrado en BD para usuario ${userId}.`
      );
      return NextResponse.json(
        { message: 'Error: No se encontró el negocio asociado a tu sesión.' },
        { status: 403 }
      );
    }
    businessForStripe = existingBusiness;
  }

  const permissionCheck = await checkPermission(userId, targetBusinessId!, [
    'OWNER',
    'ADMIN'
  ]);
  if (permissionCheck instanceof NextResponse) return permissionCheck;

  let stripeCustomerId = businessForStripe?.stripeCustomerId;

  if (!stripeCustomerId) {
    console.log(
      `[Stripe Checkout] Creando nuevo cliente en Stripe para business ID: ${targetBusinessId}`
    );
    try {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: businessForStripe?.name || undefined,
        metadata: {
          cakelyBusinessId: targetBusinessId!.toString(),
          cakelyUserId: userId
        }
      });
      stripeCustomerId = customer.id;
      await db
        .update(businesses)
        .set({ stripeCustomerId: stripeCustomerId, updatedAt: new Date() })
        .where(eq(businesses.id, targetBusinessId!));
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
      `[Stripe Checkout] Usando cliente de Stripe existente: ${stripeCustomerId} para business ID: ${businessForStripe?.id}`
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const successUrl = `${appUrl}/pago/exito?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/pago/cancelado`;

  try {
    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      payment_method_types: ['card', 'paypal'],
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
        cakelyBusinessId: businessForStripe!.id.toString(),
        cakelyUserId: userId
      },
      subscription_data: {
        metadata: {
          cakelyBusinessId: businessForStripe!.id.toString(),
          cakelyUserId: userId
        }
      }
    };

    const currentBusinessSubscription = await db.query.businesses.findFirst({
      where: eq(businesses.id, targetBusinessId!),
      columns: { subscriptionStatus: true }
    });

    const wantsTrial =
      isTrial ||
      !currentBusinessSubscription?.subscriptionStatus ||
      currentBusinessSubscription.subscriptionStatus === 'canceled';

    if (wantsTrial) {
      checkoutSessionParams.subscription_data!.trial_period_days =
        TRIAL_PERIOD_DAYS;

      checkoutSessionParams.payment_method_collection = 'if_required';
      checkoutSessionParams.subscription_data!.trial_settings = {
        end_behavior: {
          missing_payment_method: 'cancel'
        }
      };
      console.log(
        `[Stripe Checkout] Iniciando sesión de checkout con prueba de ${TRIAL_PERIOD_DAYS} días para business ${targetBusinessId}.`
      );
    } else {
      console.log(
        `[Stripe Checkout] Iniciando sesión de checkout SIN prueba para business ${targetBusinessId}.`
      );
    }

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
