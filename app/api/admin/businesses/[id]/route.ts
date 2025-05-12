import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { businesses, users } from '@/lib/db';
import { adminUpdateBusinessSchema } from '@/lib/validators/admin';
import { eq } from 'drizzle-orm';

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
  const businessIdNum = Number(pathname.split('/').pop());
  if (isNaN(businessIdNum))
    return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

  try {
    console.warn(
      `[API ADMIN DELETE Business] Iniciando borrado del negocio ID: ${businessIdNum}`
    );

    const [deletedBusiness] = await db
      .delete(businesses)
      .where(eq(businesses.id, businessIdNum))
      .returning({ id: businesses.id });

    if (!deletedBusiness)
      return NextResponse.json(
        { message: 'Negocio no encontrado' },
        { status: 404 }
      );

    console.log(
      `[API ADMIN DELETE Business] Negocio ID: ${deletedBusiness.id} eliminado.`
    );
    return NextResponse.json({
      message: `Negocio ID ${deletedBusiness.id} eliminado.`
    });
  } catch (error: any) {
    console.error(
      `[API ADMIN DELETE Business] Error borrando negocio ${businessIdNum}:`,
      error
    );
    return NextResponse.json(
      { message: 'Error al eliminar negocio', error: error.message },
      { status: 500 }
    );
  }
}
