import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productTypes } from '@/lib/db';
import { createProductTypeSchema } from '@/lib/validators/productTypes';
import { eq, and, asc, ilike } from 'drizzle-orm';
import { checkPermission } from '@/lib/auth/utils';
import { AuthenticatedRequestContext } from '@/lib/api/authTypes';
import { withApiProtection } from '@/lib/api/withApiProtection';

async function getProductTypesHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { businessId } = authContext;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Negocio no identificado' },
      { status: 400 }
    );
  }

  const { searchParams } = request.nextUrl;
  const searchTerm = searchParams.get('q') || '';

  try {
    const whereConditions = [eq(productTypes.businessId, businessId)];
    if (searchTerm) {
      whereConditions.push(ilike(productTypes.name, `%${searchTerm}%`));
    }

    const types = await db.query.productTypes.findMany({
      where: and(...whereConditions),
      orderBy: [asc(productTypes.name)]
    });
    return NextResponse.json(types);
  } catch (error: any) {
    console.error('[API GET ProductTypes] Error:', error);
    return NextResponse.json(
      { message: 'Error al obtener tipos de producto', error: error.message },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(getProductTypesHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});

async function saveProductTypeHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { userId, businessId } = authContext;

  const permissionCheck = await checkPermission(userId, businessId, [
    'OWNER',
    'ADMIN',
    'EDITOR'
  ]);
  if (permissionCheck instanceof NextResponse) return permissionCheck;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 });
  }

  const validation = createProductTypeSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.error.format() },
      { status: 400 }
    );
  }
  const { name } = validation.data;

  try {
    const existingType = await db.query.productTypes.findFirst({
      where: and(
        eq(productTypes.businessId, businessId),
        eq(productTypes.name, name)
      ),
      columns: { id: true }
    });

    if (existingType) {
      return NextResponse.json(
        {
          message: `El tipo de producto '${name}' ya existe para este negocio.`
        },
        { status: 409 }
      );
    }

    const [newProductType] = await db
      .insert(productTypes)
      .values({
        name,
        businessId
      })
      .returning();

    if (!newProductType) {
      throw new Error('No se pudo crear el tipo de producto.');
    }

    return NextResponse.json(newProductType, { status: 201 });
  } catch (error: any) {
    console.error('[API POST ProductType] Error:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { message: `El tipo de producto '${name}' ya existe (constraint).` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Error al crear tipo de producto', error: error.message },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(saveProductTypeHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});
