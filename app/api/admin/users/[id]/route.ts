import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, businesses } from '@/lib/db';
import { adminUpdateUserSchema } from '@/lib/validators/admin';
import { eq, and, ne } from 'drizzle-orm';
import { Business } from '@/types/types';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }
  const { pathname } = request.nextUrl;
  const userIdToGet = pathname.split('/').pop();
  if (!userIdToGet)
    return NextResponse.json(
      { message: 'ID de usuario inválido' },
      { status: 400 }
    );

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userIdToGet),

      with: {
        teamMemberships: {
          with: {
            business: { columns: { id: true, name: true } }
          },
          columns: { role: true, businessId: true }
        }
      }
    });
    if (!user)
      return NextResponse.json(
        { message: 'Usuario no encontrado' },
        { status: 404 }
      );
    return NextResponse.json(user);
  } catch (error: any) {}
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }
  const { pathname } = request.nextUrl;
  const userIdToUpdate = pathname.split('/').pop();
  if (!userIdToUpdate)
    return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch (e) {}
  const validation = adminUpdateUserSchema.safeParse(body);
  if (!validation.success)
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.error.format() },
      { status: 400 }
    );

  const { ...dataToUpdate } = validation.data;
  const finalDataToUpdate = { ...dataToUpdate, updatedAt: new Date() };

  try {
    if (finalDataToUpdate.email) {
      const existingUserWithEmail = await db.query.users.findFirst({
        where: and(
          eq(users.email, finalDataToUpdate.email),
          ne(users.id, userIdToUpdate)
        ),
        columns: { id: true }
      });
      if (existingUserWithEmail) {
        return NextResponse.json(
          { message: 'El email ya está en uso por otro usuario.' },
          { status: 409 }
        );
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set(finalDataToUpdate)
      .where(eq(users.id, userIdToUpdate))
      .returning();

    if (!updatedUser)
      return NextResponse.json(
        { message: 'Usuario no encontrado o fallo al actualizar' },
        { status: 404 }
      );
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error(`[API ADMIN PATCH User ${userIdToUpdate}] Error:`, error);
    if (error.code === '23505') {
      return NextResponse.json(
        { message: 'Error: El email ya está en uso.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Error al actualizar usuario', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }
  const { pathname } = request.nextUrl;
  const userIdToDelete = pathname.split('/').pop();
  if (!userIdToDelete)
    return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

  try {
    const ownedBusinesses = await db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(eq(businesses.ownerUserId, userIdToDelete));
    if (ownedBusinesses.length > 0) {
      return NextResponse.json(
        {
          message: `Este usuario es propietario de los siguientes negocios: ${ownedBusinesses.map((b: Business) => b.name).join(', ')}. No se puede eliminar hasta reasignar la propiedad o eliminar esos negocios primero.`
        },
        { status: 409 }
      );
    }

    console.warn(
      `[API ADMIN DELETE User] Iniciando borrado PERMANENTE del usuario ID: ${userIdToDelete}`
    );
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, userIdToDelete))
      .returning({ id: users.id });

    if (!deletedUser)
      return NextResponse.json(
        { message: 'Usuario no encontrado' },
        { status: 404 }
      );

    console.log(
      `[API ADMIN DELETE User] Usuario ID: ${deletedUser.id} eliminado.`
    );
    return NextResponse.json({
      message: `Usuario ID ${deletedUser.id} eliminado.`
    });
  } catch (error: any) {
    console.error(
      `[API ADMIN DELETE User] Error borrando usuario ${userIdToDelete}:`,
      error
    );
    return NextResponse.json(
      { message: 'Error al eliminar usuario', error: error.message },
      { status: 500 }
    );
  }
}
