import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { businesses, users, teamMembers, businessSettings } from '@/lib/db';
import { createBusinessFormSchema } from '@/lib/validators/business';
import { eq, and } from 'drizzle-orm';
import { TeamRoleEnum } from '@/types/types';

export async function POST(request: NextRequest) {
  console.log('IN THE POST');
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }

  const userId = session.user.id;
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { message: 'Cuerpo de petición inválido.' },
      { status: 400 }
    );
  }

  const validation = createBusinessFormSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { message: 'Datos inválidos.', errors: validation.error.format() },
      { status: 400 }
    );
  }

  const { name } = validation.data;

  try {
    const newBusinessFull = await db.transaction(async (tx: any) => {
      const [newBusiness] = await tx
        .insert(businesses)
        .values({
          name,
          ownerUserId: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!newBusiness) {
        throw new Error('No se pudo crear el negocio en la tabla businesses.');
      }

      await tx.insert(teamMembers).values({
        userId: userId,
        businessId: newBusiness.id,
        role: TeamRoleEnum.OWNER,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await tx
        .update(users)
        .set({ businessId: newBusiness.id, updatedAt: new Date() })
        .where(eq(users.id, userId));

      await tx.insert(businessSettings).values({
        businessId: newBusiness.id,

        updatedAt: new Date()
      });

      console.log(
        `[API Create Business] Negocio ${newBusiness.id} creado para usuario ${userId}. Usuario actualizado con businessId.`
      );
      return newBusiness;
    });

    return NextResponse.json(newBusinessFull, { status: 201 });
  } catch (error: any) {
    console.error('[API Create Business] Error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        {
          message: 'Error al crear el negocio. Posiblemente datos duplicados.'
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno al crear el negocio.', error: error.message },
      { status: 500 }
    );
  }
}
