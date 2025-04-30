import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getSessionInfo } from '@/lib/auth/utils';

const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre no puede estar vacío.')
      .optional(),
    image: z.string().url('URL de imagen inválida').nullable().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nada que actualizar.'
  });

export async function PATCH(request: NextRequest) {
  const sessionInfo = await getSessionInfo(request);
  if (sessionInfo instanceof NextResponse) return sessionInfo;
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

  const dataToUpdate = validation.data;

  try {
    const setData: Partial<{
      name: string;
      image: string | null;
      updatedAt: Date;
    }> = {};
    if (dataToUpdate.name !== undefined) {
      setData.name = dataToUpdate.name;
    }

    if (dataToUpdate.image !== undefined) {
      setData.image = dataToUpdate.image;
    }
    setData.updatedAt = new Date();

    if (Object.keys(setData).length <= 1) {
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, name: true, email: true, image: true }
      });
      return NextResponse.json(
        currentUser ?? { message: 'No se realizaron cambios.' }
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set(setData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image
      });

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    console.log(`User ${userId} updated profile.`);
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
