import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getSessionInfo } from '@/lib/auth/utils';

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'El nombre no puede estar vacío.')
});

export async function PATCH(request: NextRequest) {
  const sessionInfo = await getSessionInfo(request);
  if (sessionInfo instanceof NextResponse) {
    return sessionInfo;
  }
  const { userId } = sessionInfo;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 });
  }

  const validation = updateProfileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.error.format() },
      { status: 400 }
    );
  }
  const { name: newName } = validation.data;

  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        name: newName,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image
      });

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Usuario no encontrado para actualizar' },
        { status: 404 }
      );
    }

    console.log(
      `User <span class="math-inline">\{userId\} updated their name to "</span>{newName}"`
    );
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(
      `[USER_PROFILE_PATCH] Error updating profile for user ${userId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Error interno al actualizar el perfil.' },
      { status: 500 }
    );
  }
}
