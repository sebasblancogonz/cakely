import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productTypes } from '@/lib/db';
import { updateProductTypeSchema } from '@/lib/validators/productTypes';
import { eq, and, ne } from 'drizzle-orm';
import { checkPermission } from '@/lib/auth/utils';
import { AuthenticatedRequestContext } from '@/lib/api/authTypes';
import { withApiProtection } from '@/lib/api/withApiProtection';

async function getProductTypeHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { businessId } = authContext;

  const { pathname } = request.nextUrl;
  const id = Number(pathname.split('/').pop());
  if (isNaN(id)) {
    return NextResponse.json(
      { message: 'ID de tipo de producto inválido' },
      { status: 400 }
    );
  }

  try {
    const type = await db.query.productTypes.findFirst({
      where: and(
        eq(productTypes.id, id),
        eq(productTypes.businessId, businessId)
      )
    });

    if (!type) {
      return NextResponse.json(
        { message: 'Tipo de producto no encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json(type);
  } catch (error: any) {
    console.error(`[API GET ProductType ID: ${id}] Error:`, error);
    return NextResponse.json(
      { message: 'Error al obtener tipo de producto', error: error.message },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(getProductTypeHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});

async function updateProductTypeHandler(
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

  const { pathname } = request.nextUrl;
  const id = Number(pathname.split('/').pop());
  if (isNaN(id)) {
    return NextResponse.json(
      { message: 'ID de tipo de producto inválido' },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 });
  }

  const validation = updateProductTypeSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { message: 'Datos inválidos', errors: validation.error.format() },
      { status: 400 }
    );
  }
  const { name } = validation.data;

  try {
    if (name) {
      const existingType = await db.query.productTypes.findFirst({
        where: and(
          eq(productTypes.businessId, businessId),
          eq(productTypes.name, name),
          ne(productTypes.id, id)
        ),
        columns: { id: true }
      });
      if (existingType) {
        return NextResponse.json(
          { message: `El tipo de producto '${name}' ya existe.` },
          { status: 409 }
        );
      }
    }

    const [updatedProductType] = await db
      .update(productTypes)
      .set({
        ...(name && { name }),
        updatedAt: new Date()
      })
      .where(
        and(eq(productTypes.id, id), eq(productTypes.businessId, businessId))
      )
      .returning();

    if (!updatedProductType) {
      return NextResponse.json(
        { message: 'Tipo de producto no encontrado o no se pudo actualizar' },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedProductType);
  } catch (error: any) {
    console.error(`[API PATCH ProductType ID: ${id}] Error:`, error);
    if (error.code === '23505') {
      return NextResponse.json(
        { message: `El tipo de producto '${name}' ya existe (constraint).` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Error al actualizar tipo de producto', error: error.message },
      { status: 500 }
    );
  }
}

export const PATCH = withApiProtection(updateProductTypeHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});

async function deleteProductTypeHandler(
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

  const { pathname } = request.nextUrl;
  const id = Number(pathname.split('/').pop());
  if (isNaN(id)) {
    return NextResponse.json(
      { message: 'ID de tipo de producto inválido' },
      { status: 400 }
    );
  }

  try {
    const [deletedProductType] = await db
      .delete(productTypes)
      .where(
        and(eq(productTypes.id, id), eq(productTypes.businessId, businessId))
      )
      .returning({ id: productTypes.id });

    if (!deletedProductType) {
      return NextResponse.json(
        { message: 'Tipo de producto no encontrado o no se pudo eliminar' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: 'Tipo de producto eliminado correctamente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`[API DELETE ProductType ID: ${id}] Error:`, error);
    return NextResponse.json(
      { message: 'Error al eliminar tipo de producto', error: error.message },
      { status: 500 }
    );
  }
}

export const DELETE = withApiProtection(deleteProductTypeHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});
