import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  businesses,
  users,
  teamMembers,
  businessSettings,
  teamRoleEnum
} from '@/lib/db';
import { adminCreateBusinessSchema } from '@/lib/validators/admin';
import { eq, ilike, desc, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q') || '';

  try {
    const searchCondition = q
      ? or(
          ilike(businesses.name, `%${q}%`),
          ilike(users.name, `%${q}%`),
          ilike(users.email, `%${q}%`)
        )
      : undefined;

    const query = db
      .select({
        id: businesses.id,
        name: businesses.name,
        logoUrl: businesses.logoUrl,
        ownerEmail: users.email,
        ownerName: users.name,
        createdAt: businesses.createdAt
      })
      .from(businesses)
      .leftJoin(users, eq(businesses.ownerUserId, users.id))
      .orderBy(desc(businesses.createdAt));

    if (searchCondition) {
      query.where(searchCondition);
    }

    const allBusinesses = await query;

    return NextResponse.json(allBusinesses);
  } catch (error: any) {
    console.error('[API ADMIN GET Businesses] Error:', error);
    return NextResponse.json(
      { message: 'Error al obtener negocios', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }
  const superAdminUserId = session.user.id;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Cuerpo inválido', status: 400 });
  }

  const validation = adminCreateBusinessSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.error.format() },
      { status: 400 }
    );
  }
  const { name, ownerEmail } = validation.data;

  try {
    const newBusiness = await db.transaction(async (tx: any) => {
      let [ownerUser] = await tx
        .select()
        .from(users)
        .where(eq(users.email, ownerEmail));

      if (!ownerUser) {
        throw new Error(
          `Usuario propietario con email ${ownerEmail} no encontrado. Créalo primero.`
        );
      }
      if (!ownerUser?.id)
        throw new Error('No se pudo obtener el ID del propietario.');

      const [createdBusiness] = await tx
        .insert(businesses)
        .values({ name, ownerUserId: ownerUser.id })
        .returning();

      if (!createdBusiness) throw new Error('Fallo al crear el negocio.');

      await tx.insert(teamMembers).values({
        businessId: createdBusiness.id,
        userId: ownerUser.id,
        role: teamRoleEnum.enumValues[0],
        joinedAt: new Date()
      });

      await tx.insert(businessSettings).values({
        businessId: createdBusiness.id
      });

      return createdBusiness;
    });

    return NextResponse.json(newBusiness, { status: 201 });
  } catch (error: any) {
    console.error('[API ADMIN POST Business] Error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { message: 'Un negocio con este nombre o datos ya existe.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        message: error.message || 'Error al crear el negocio',
        error: error.detail || error.message
      },
      { status: 500 }
    );
  }
}
