import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, users } from '@/lib/db';
import { eq, ilike, or, count, and } from 'drizzle-orm';
import { adminCreateUserSchema } from '@/lib/validators/admin';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q') || '';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    const searchCondition = q
      ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`))
      : undefined;

    const whereClause = searchCondition ? and(searchCondition) : undefined;

    const allUsersQuery = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        emailVerified: users.emailVerified,
        isSuperAdmin: users.isSuperAdmin
      })
      .from(users)

      .limit(limit)
      .offset(offset);

    if (whereClause) {
      allUsersQuery.where(whereClause);
    }
    const allUsers = await allUsersQuery;

    const totalResult = await db
      .select({ value: count() })
      .from(users)

      .where(whereClause);
    const totalUsers = totalResult[0]?.value ?? 0;
    const newOffset =
      offset + allUsers.length < totalUsers ? offset + allUsers.length : null;

    return NextResponse.json({ users: allUsers, totalUsers, newOffset });
  } catch (error: any) {
    console.error('[API ADMIN GET Users] Error:', error);
    return NextResponse.json(
      { message: 'Error al obtener usuarios', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json(
      { message: 'Acceso denegado: Requiere SuperAdmin' },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { message: 'Cuerpo JSON inválido' },
      { status: 400 }
    );
  }

  const validation = adminCreateUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.error.format() },
      { status: 400 }
    );
  }

  const { name, email, isSuperAdmin } = validation.data;
  const emailLower = email.toLowerCase();

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, emailLower),
      columns: { id: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: `El email '${emailLower}' ya está registrado.` },
        { status: 409 }
      );
    }
    const newUserId = uuidv4();

    const [createdUser] = await db
      .insert(users)
      .values({
        id: newUserId,
        name: name || null,
        email: emailLower,
        emailVerified: null,
        image: null,
        isSuperAdmin: isSuperAdmin || false
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        isSuperAdmin: users.isSuperAdmin,
        emailVerified: users.emailVerified,
        image: users.image
      });

    if (!createdUser) {
      throw new Error('No se pudo crear el usuario en la base de datos.');
    }

    return NextResponse.json(createdUser, { status: 201 });
  } catch (error: any) {
    console.error('[API ADMIN POST User] Error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { message: 'Error: El email ya está en uso (constraint DB).' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Error al crear el usuario', error: error.message },
      { status: 500 }
    );
  }
}
