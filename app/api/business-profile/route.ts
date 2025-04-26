import { NextRequest, NextResponse } from 'next/server';
import { db, businesses } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { profilePatchSchema } from '@/lib/validators/business';

export async function GET(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await db
      .select({
        name: businesses.name,
        logoUrl: businesses.logoUrl,
        id: businesses.id
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    const profile = result[0];

    if (!profile) {
      return NextResponse.json(
        { message: 'Perfil de negocio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error(
      `[BUSINESS_PROFILE_GET] Error fetching profile for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Error al obtener el perfil' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { message: 'Cuerpo de la solicitud inválido' },
      { status: 400 }
    );
  }

  const validation = profilePatchSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.error.format() },
      { status: 400 }
    );
  }

  const dataToUpdate = validation.data;
  if (dataToUpdate.logoUrl === '') {
    dataToUpdate.logoUrl = null;
  }

  try {
    const updatedResult = await db
      .update(businesses)
      .set(dataToUpdate)
      .where(eq(businesses.id, businessId))
      .returning({
        name: businesses.name,
        logoUrl: businesses.logoUrl
      });

    if (updatedResult.length === 0) {
      return NextResponse.json(
        { message: 'Perfil de negocio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedResult[0]);
  } catch (error) {
    console.error(
      `[BUSINESS_PROFILE_PATCH] Error updating profile for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Error al actualizar el perfil' },
      { status: 500 }
    );
  }
}
