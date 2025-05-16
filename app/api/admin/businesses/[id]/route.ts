import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { businesses, users } from '@/lib/db';
import { adminUpdateBusinessSchema } from '@/lib/validators/admin';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY no está definida.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil', // O la que estés usando consistentemente
  typescript: true
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }

  const { pathname } = request.nextUrl;
  const businessIdNum = Number(pathname.split('/').pop());
  if (isNaN(businessIdNum))
    return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

  try {
    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessIdNum),
      with: {
        owner: { columns: { id: true, name: true, email: true } },
        teamMembers: {
          with: { user: { columns: { id: true, name: true, email: true } } }
        },
        settings: true
      }
    });
    if (!business)
      return NextResponse.json(
        { message: 'Negocio no encontrado' },
        { status: 404 }
      );
    return NextResponse.json(business);
  } catch (error: any) {}
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }

  const { pathname } = request.nextUrl;
  const businessIdNum = Number(pathname.split('/').pop());
  if (isNaN(businessIdNum))
    return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch (e) {}
  const validation = adminUpdateBusinessSchema.safeParse(body);
  if (!validation.success)
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.error.format() },
      { status: 400 }
    );

  const dataToUpdate = { ...validation.data, updatedAt: new Date() };

  try {
    if (dataToUpdate.ownerUserId) {
      const ownerExists = await db.query.users.findFirst({
        where: eq(users.id, dataToUpdate.ownerUserId)
      });
      if (!ownerExists)
        return NextResponse.json(
          { message: 'Nuevo owner ID no encontrado.' },
          { status: 400 }
        );
    }

    const [updatedBusiness] = await db
      .update(businesses)
      .set(dataToUpdate)
      .where(eq(businesses.id, businessIdNum))
      .returning();

    if (!updatedBusiness)
      return NextResponse.json(
        { message: 'Negocio no encontrado o fallo al actualizar' },
        { status: 404 }
      );
    return NextResponse.json(updatedBusiness);
  } catch (error: any) {}
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }

  const { pathname } = request.nextUrl;
  const businessIdToDelete = Number(pathname.split('/').pop());
  if (isNaN(businessIdToDelete)) {
    return NextResponse.json(
      { message: 'ID de negocio inválido' },
      { status: 400 }
    );
  }

  try {
    const businessToDeleteData = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessIdToDelete),
      columns: {
        id: true,
        name: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true
      }
    });

    if (!businessToDeleteData) {
      return NextResponse.json(
        { message: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    if (businessToDeleteData.stripeSubscriptionId) {
      console.log(
        `[Admin Delete Business] Iniciando cancelación de Stripe Subscription ID: ${businessToDeleteData.stripeSubscriptionId} para negocio ${businessToDeleteData.name} (ID: ${businessToDeleteData.id})`
      );
      try {
        const canceledSubscription = await stripe.subscriptions.cancel(
          businessToDeleteData.stripeSubscriptionId,
          {
            prorate: true,
            invoice_now: true
          }
        );
        console.log(
          `[Admin Delete Business] Suscripción de Stripe ${canceledSubscription.id} cancelada. Estado: ${canceledSubscription.status}. Crédito (si aplica) añadido al balance del cliente en Stripe.`
        );
      } catch (stripeError: any) {
        console.error(
          `[Admin Delete Business] Error cancelando la suscripción de Stripe ${businessToDeleteData.stripeSubscriptionId}:`,
          stripeError
        );

        return NextResponse.json(
          {
            message: `Negocio NO eliminado de Cakely. Falló la cancelación de la suscripción en Stripe: ${stripeError.message}. Por favor, cancela manualmente en Stripe y luego intenta borrar el negocio de nuevo.`,
            stripeError: stripeError.code
          },
          { status: 500 }
        );
      }
    } else {
      console.log(
        `[Admin Delete Business] El negocio ${businessToDeleteData.name} (ID: ${businessToDeleteData.id}) no tenía un stripeSubscriptionId activo.`
      );
    }

    console.warn(
      `[Admin Delete Business] Iniciando borrado de la base de datos para el negocio ID: ${businessIdToDelete} y todos sus datos asociados (CASCADE).`
    );

    const [deletedBusiness] = await db
      .delete(businesses)
      .where(eq(businesses.id, businessIdToDelete))
      .returning({ id: businesses.id, name: businesses.name });

    if (!deletedBusiness) {
      return NextResponse.json(
        {
          message:
            'Negocio no encontrado durante el intento de borrado de la base de datos (después de la cancelación de Stripe si aplicaba).'
        },
        { status: 404 }
      );
    }

    console.log(
      `[Admin Delete Business] Negocio "${deletedBusiness.name}" (ID: ${deletedBusiness.id}) y sus datos asociados eliminados de la base de datos de Cakely.`
    );
    return NextResponse.json({
      message: `Negocio "${deletedBusiness.name}" y su suscripción de Stripe (si existía) han sido cancelados/eliminados. El crédito por tiempo no usado (si aplica) se ha añadido al balance del cliente en Stripe.`
    });
  } catch (error: any) {
    console.error(
      `[Admin Delete Business] Error general borrando negocio ${businessIdToDelete}:`,
      error
    );
    return NextResponse.json(
      { message: 'Error al eliminar el negocio.', error: error.message },
      { status: 500 }
    );
  }
}
