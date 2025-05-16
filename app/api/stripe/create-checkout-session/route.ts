import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, teamMembers, users } from '@/lib/db';
import { businesses } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createCheckoutSessionSchema } from '@/lib/validators/stripe';
import Stripe from 'stripe';
import { checkPermission } from '@/lib/auth/utils';
import { TeamRoleEnum } from '@/types/types';
import { cookies } from 'next/headers';

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
  let currentBusinessIdFromSession = session.user.businessId;

  let reqBody;
  try {
    reqBody = await request.json();
  } catch (error) {
    console.error('[Stripe Checkout] Error parseando JSON body:', error);
    return NextResponse.json(
      { message: 'Cuerpo de la petición inválido.' },
      { status: 400 }
    );
  }

  const validation = createCheckoutSessionSchema.safeParse(reqBody);
  if (!validation.success) {
    console.error(
      '[Stripe Checkout] Zod validation error:',
      validation.error.format()
    );
    return NextResponse.json(
      { message: 'Datos inválidos.', errors: validation.error.format() },
      { status: 400 }
    );
  }

  const { priceId, isTrial: frontendRequestsTrial } = validation.data;

  let targetBusinessId = currentBusinessIdFromSession;
  let businessDataForStripe: {
    id: number;
    name: string | null;
    stripeCustomerId: string | null;
    subscriptionStatus: string | null;
    stripeCurrentPeriodEnd: Date | null;
    isLifetime: boolean | null;
  } | null = null;

  try {
    if (!targetBusinessId) {
      console.log(
        `[Stripe Checkout] Usuario ${userId} no tiene negocio. Creando uno por defecto.`
      );
      const defaultBusinessName = userName
        ? `Pastelería de ${userName.split(' ')[0]}`
        : `Mi Negocio (${userId.substring(0, 6)})`;

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
          stripeCustomerId: businesses.stripeCustomerId,
          subscriptionStatus: businesses.subscriptionStatus,
          stripeCurrentPeriodEnd: businesses.stripeCurrentPeriodEnd,
          isLifetime: businesses.isLifetime
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
        .set({ businessId: targetBusinessId, updatedAt: new Date() })
        .where(eq(users.id, userId));

      businessDataForStripe = newBusiness;
      console.log(
        `[Stripe Checkout] Negocio por defecto ${targetBusinessId} ('${newBusiness.name}') creado y asignado a usuario ${userId}.`
      );
    } else {
      const existingBusiness = await db.query.businesses.findFirst({
        where: eq(businesses.id, targetBusinessId),
        columns: {
          id: true,
          name: true,
          stripeCustomerId: true,
          subscriptionStatus: true,
          stripeCurrentPeriodEnd: true,
          isLifetime: true
        }
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
      businessDataForStripe = existingBusiness;
    }
  } catch (dbError: any) {
    console.error(
      '[Stripe Checkout] Error en operaciones de base de datos para negocio:',
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

  if (!businessDataForStripe || !targetBusinessId) {
    return NextResponse.json(
      { message: 'No se pudo determinar el negocio para la suscripción.' },
      { status: 500 }
    );
  }

  const permissionCheck = await checkPermission(userId, targetBusinessId, [
    'OWNER',
    'ADMIN'
  ]);
  if (permissionCheck instanceof NextResponse) return permissionCheck;

  if (businessDataForStripe.isLifetime) {
    console.log(
      `[Stripe Checkout] Negocio ${targetBusinessId} ya tiene acceso vitalicio.`
    );
    return NextResponse.json(
      {
        message:
          'Este negocio ya tiene acceso vitalicio y no requiere una nueva suscripción.'
      },
      { status: 403 }
    );
  }

  let stripeCustomerId = businessDataForStripe.stripeCustomerId;

  if (!stripeCustomerId) {
    console.log(
      `[Stripe Checkout] Creando nuevo cliente en Stripe para business ID: ${targetBusinessId}`
    );
    try {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: businessDataForStripe.name || undefined,
        metadata: {
          cakelyBusinessId: targetBusinessId.toString(),
          cakelyUserId: userId
        }
      });
      stripeCustomerId = customer.id;
      await db
        .update(businesses)
        .set({ stripeCustomerId: stripeCustomerId, updatedAt: new Date() })
        .where(eq(businesses.id, targetBusinessId));
      console.log(
        `[Stripe Checkout] Cliente Stripe ${stripeCustomerId} creado para business ${targetBusinessId}.`
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
      `[Stripe Checkout] Usando cliente de Stripe existente: ${stripeCustomerId} para business ID: ${targetBusinessId}`
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const successUrl = `${appUrl}/pago/exito?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/pago/limpiar-y-cancelado`;

  const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: stripeCustomerId,
    payment_method_types: ['card', 'paypal'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      cakelyBusinessId: targetBusinessId.toString(),
      cakelyUserId: userId
    },
    subscription_data: {
      metadata: {
        cakelyBusinessId: targetBusinessId.toString(),
        cakelyUserId: userId
      }
    }
  };

  const currentDbStatus = businessDataForStripe.subscriptionStatus;
  const currentDbPeriodEnd = businessDataForStripe.stripeCurrentPeriodEnd;
  let applyTrialToThisCheckout = false;

  if (currentDbStatus === 'active') {
    applyTrialToThisCheckout = false;
    console.log(
      `[Stripe Checkout] Negocio ${targetBusinessId} ya tiene suscripción activa ('${currentDbStatus}'). No se aplicará prueba.`
    );
  } else if (
    currentDbStatus === 'trialing' &&
    currentDbPeriodEnd &&
    new Date(currentDbPeriodEnd) > new Date()
  ) {
    applyTrialToThisCheckout = false;
    console.log(
      `[Stripe Checkout] Negocio ${targetBusinessId} ya está en prueba válida ('${currentDbStatus}') hasta ${currentDbPeriodEnd}. No se aplicará nueva prueba.`
    );
  } else {
    if (frontendRequestsTrial === true) {
      applyTrialToThisCheckout = true;
    } else if (
      frontendRequestsTrial === undefined &&
      (!currentDbStatus ||
        ['canceled', 'past_due', 'unpaid', 'incomplete_expired'].includes(
          currentDbStatus
        ))
    ) {
      applyTrialToThisCheckout = true;
    }
  }

  if (applyTrialToThisCheckout) {
    checkoutSessionParams.subscription_data!.trial_period_days =
      TRIAL_PERIOD_DAYS;
    checkoutSessionParams.payment_method_collection = 'if_required';
    checkoutSessionParams.subscription_data!.trial_settings = {
      end_behavior: { missing_payment_method: 'cancel' }
    };
    console.log(
      `[Stripe Checkout] Iniciando sesión de checkout CON PRUEBA de ${TRIAL_PERIOD_DAYS} días para business ${targetBusinessId}.`
    );
  } else {
    console.log(
      `[Stripe Checkout] Iniciando sesión de checkout SIN PRUEBA para business ${targetBusinessId}.`
    );
    checkoutSessionParams.payment_method_collection = 'always';
    if (checkoutSessionParams.subscription_data) {
      delete checkoutSessionParams.subscription_data.trial_period_days;
      delete checkoutSessionParams.subscription_data.trial_settings;
    }
  }

  try {
    const stripeSession = await stripe.checkout.sessions.create(
      checkoutSessionParams
    );
    const cookieStore = cookies();
    const cancelTokenValue = `checkout-attempt-${Date.now()}`;
    (await cookieStore).set('stripe_checkout_cancel_flag', cancelTokenValue, {
      path: '/',
      maxAge: 60 * 10,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    console.log(
      `[Stripe Checkout] Cookie 'stripe_checkout_cancel_flag' establecida.`
    );
    console.log(
      `[Stripe Checkout] Sesión de Checkout creada: ${stripeSession.id} para priceId: ${priceId}`
    );
    return NextResponse.json({ sessionId: stripeSession.id });
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
