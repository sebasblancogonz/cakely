import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { businesses, customers, db, productTypes } from '@/lib/db';
import { orders } from '@/lib/db';
import { getOrders } from '@/lib/db';
import { OrderStatus } from '@types';
import { createOrderFormSchema } from '@/lib/validators/orders';
import { and, eq, max, sql } from 'drizzle-orm';
import {
  combineDeliveryDateAndTime,
  createCalendarEventIfNeeded,
  prepareOrderDataForInsert
} from '@/lib/order';

export async function GET(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  const { searchParams } = request.nextUrl;

  const search = searchParams.get('q') || '';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const status = searchParams.get('status');
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  const validStatus =
    status &&
    (status === 'Todo' ||
      Object.values(OrderStatus).includes(status as OrderStatus))
      ? status
      : null;

  try {
    const { orders, newOffset, totalOrders } = await getOrders(
      businessId,
      search,
      offset,
      limit,
      validStatus,
      sortBy,
      sortOrder
    );

    return NextResponse.json({ orders, newOffset, totalOrders });
  } catch (error: any) {
    console.error(
      `API Error fetching orders for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch orders', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  if (!userId || !userEmail || !businessId) {
    return NextResponse.json(
      { message: 'No autenticado o falta información requerida' },
      { status: 401 }
    );
  }

  try {
    const orderInput: unknown = await request.json();
    const validationResult = createOrderFormSchema.safeParse(orderInput);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validationResult.error.format() },
        { status: 400 }
      );
    }
    const validatedData = validationResult.data;
    const finalDeliveryDateTime = combineDeliveryDateAndTime(
      validatedData.deliveryDate,
      validatedData.deliveryTime
    );

    const orderCreated = await db.transaction(async (tx: any) => {
      await tx.execute(
        sql`SELECT id FROM ${businesses} WHERE id = ${businessId} FOR UPDATE`
      );

      let productTypeIdToUse: number;
      const productName = validatedData.productType;
      const [existingProductType] = await tx
        .select({ id: productTypes.id })
        .from(productTypes)
        .where(
          and(
            eq(productTypes.businessId, businessId),
            eq(
              sql`lower(${productTypes.name})`,
              productName.toLowerCase().trim()
            )
          )
        )
        .limit(1);

      if (existingProductType) {
        productTypeIdToUse = existingProductType.id;
        console.log(
          `[Order Create Tx] Usando productType existente ID: ${productTypeIdToUse} para "${productName}"`
        );
      } else {
        console.log(
          `[Order Create Tx] Creando nuevo productType: "${productName}"`
        );
        const [newType] = await tx
          .insert(productTypes)
          .values({
            name: productName.trim(),
            businessId: businessId
          })
          .returning({ id: productTypes.id });
        if (!newType || !newType.id)
          throw new Error('No se pudo crear el nuevo tipo de producto.');
        productTypeIdToUse = newType.id;
      }
      const maxResult = await tx
        .select({ maxValue: max(orders.businessOrderNumber) })
        .from(orders)
        .where(eq(orders.businessId, businessId));
      const nextNumber = (maxResult[0]?.maxValue ?? 0) + 1;

      const dataToInsert = prepareOrderDataForInsert(
        validatedData,
        finalDeliveryDateTime,
        businessId,
        nextNumber,
        productTypeIdToUse
      );
      const [insertedOrder] = await tx
        .insert(orders)
        .values(dataToInsert)
        .returning();
      if (!insertedOrder) throw new Error('No se pudo guardar el pedido.');

      return insertedOrder;
    });

    await createCalendarEventIfNeeded({
      order: {
        ...orderCreated
      },
      deliveryDate: finalDeliveryDateTime,
      userEmail,
      createCalendarEvent: validatedData.createCalendarEvent,
      userId
    });

    const finalOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderCreated.id),
      with: {
        customer: { columns: { name: true } },
        productType: { columns: { name: true } }
      }
    });

    return NextResponse.json(finalOrder ?? orderCreated, { status: 201 });
  } catch (error: any) {
    console.error(`API Error creando pedido:`, error);

    if (
      error.code === '23505' &&
      error.constraint === 'orders_business_id_business_order_number_unique'
    ) {
      return NextResponse.json(
        {
          message: 'Error de concurrencia. Intenta de nuevo.',
          error: error.message
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: 'Error interno', error: error.message },
      { status: 500 }
    );
  }
}
